import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class NotionRichTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Notion Rich Text Splitter',
		name: 'notionRichTextSplitter',
		icon: 'file:notion.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Split and append rich text to Notion pages (bypasses 2,000 char limit)',
		defaults: {
			name: 'Notion Rich Text Splitter',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'notionApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Append Rich Text',
						value: 'appendRichText',
						description: 'Append rich text to a page, splitting into multiple blocks if needed',
						action: 'Append rich text to a page',
					},
					{
						name: 'Split Rich Text Only',
						value: 'splitOnly',
						description: 'Split rich text into blocks without appending (for preview/testing)',
						action: 'Split rich text into blocks',
					},
				],
				default: 'appendRichText',
			},
			{
				displayName: 'Page ID',
				name: 'pageId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['appendRichText'],
					},
				},
				description: 'The ID of the Notion page to append to',
			},
			{
				displayName: 'Rich Text',
				name: 'richText',
				type: 'json',
				default: '[]',
				required: true,
				description: 'The Notion rich text array to split and append',
				placeholder: '[{"type": "text", "text": {"content": "Hello"}}]',
			},
			{
				displayName: 'Max Characters Per Block',
				name: 'maxChars',
				type: 'number',
				default: 1900,
				description: 'Maximum characters per rich text block (Notion limit is 2,000)',
			},
			{
				displayName: 'Block Type',
				name: 'blockType',
				type: 'options',
				options: [
					{
						name: 'Paragraph',
						value: 'paragraph',
					},
					{
						name: 'Heading 1',
						value: 'heading_1',
					},
					{
						name: 'Heading 2',
						value: 'heading_2',
					},
					{
						name: 'Heading 3',
						value: 'heading_3',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Callout',
						value: 'callout',
					},
				],
				default: 'paragraph',
				description: 'The type of block to create',
			},
			{
				displayName: 'Batch Size',
				name: 'batchSize',
				type: 'number',
				default: 100,
				description: 'Number of blocks to send per API request (Notion max is 100)',
				displayOptions: {
					show: {
						operation: ['appendRichText'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['appendRichText'],
					},
				},
				options: [
					{
						displayName: 'After Block ID',
						name: 'after',
						type: 'string',
						default: '',
						description: 'Insert blocks after this block ID',
					},
					{
						displayName: 'Delay Between Batches (ms)',
						name: 'delayMs',
						type: 'number',
						default: 300,
						description: 'Delay between batch requests to avoid rate limiting',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'appendRichText') {
					const pageId = this.getNodeParameter('pageId', i) as string;
					const richTextInput = this.getNodeParameter('richText', i) as string;
					const maxChars = this.getNodeParameter('maxChars', i) as number;
					const blockType = this.getNodeParameter('blockType', i) as string;
					const batchSize = this.getNodeParameter('batchSize', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i) as any;

					// Parse rich text
					let richText: any[];
					try {
						richText = typeof richTextInput === 'string'
							? JSON.parse(richTextInput)
							: richTextInput;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid rich text JSON format',
							{ itemIndex: i }
						);
					}

					// Split rich text into blocks
					const blocks = NotionRichTextSplitter.splitRichTextIntoBlocks(richText, maxChars, blockType);

					// Split blocks into batches
					const batches = NotionRichTextSplitter.chunkArray(blocks, batchSize);

					// Get credentials
					const credentials = await this.getCredentials('notionApi');
					const notionToken = credentials.apiKey as string;

					let totalBlocksCreated = 0;
					const results: any[] = [];

					// Send each batch
					for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
						const batch = batches[batchIndex];

						const body: any = {
							children: batch,
						};

						if (additionalFields.after && batchIndex === 0) {
							body.after = additionalFields.after;
						}

						const response = await this.helpers.request({
							method: 'PATCH',
							url: `https://api.notion.com/v1/blocks/${pageId}/children`,
							headers: {
								'Authorization': `Bearer ${notionToken}`,
								'Notion-Version': '2022-06-28',
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});

						totalBlocksCreated += batch.length;
						results.push(response);

						// Delay between batches to avoid rate limiting
						if (batchIndex < batches.length - 1 && additionalFields.delayMs) {
							await new Promise(resolve => setTimeout(resolve, additionalFields.delayMs));
						}
					}

					returnData.push({
						json: {
							success: true,
							pageId,
							totalBlocksCreated,
							batchesSent: batches.length,
							results,
						},
						pairedItem: { item: i },
					});

				} else if (operation === 'splitOnly') {
					const richTextInput = this.getNodeParameter('richText', i) as string;
					const maxChars = this.getNodeParameter('maxChars', i) as number;
					const blockType = this.getNodeParameter('blockType', i) as string;

					// Parse rich text
					let richText: any[];
					try {
						richText = typeof richTextInput === 'string'
							? JSON.parse(richTextInput)
							: richTextInput;
					} catch (error) {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid rich text JSON format',
							{ itemIndex: i }
						);
					}

					// Split rich text into blocks
					const blocks = NotionRichTextSplitter.splitRichTextIntoBlocks(richText, maxChars, blockType);

					returnData.push({
						json: {
							blocks,
							blockCount: blocks.length,
							preview: blocks.map((block: any) => {
								const text = block[blockType].rich_text
									.map((rt: any) => rt.text?.content || '')
									.join('');
								return {
									length: text.length,
									preview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
								};
							}),
						},
						pairedItem: { item: i },
					});
				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	// Helper method to split rich text into blocks
	private static splitRichTextIntoBlocks(
		richTextArray: any[],
		maxChars: number,
		blockType: string
	): any[] {
		const blocks: any[] = [];
		let currentRichText: any[] = [];
		let currentLength = 0;

		for (const segment of richTextArray) {
			const segmentText = segment.text?.content || segment.mention?.plain_text || '';
			const segmentLength = segmentText.length;

			// If single segment exceeds limit, split it
			if (segmentLength > maxChars) {
				if (currentRichText.length > 0) {
					blocks.push(NotionRichTextSplitter.createBlock(currentRichText, blockType));
					currentRichText = [];
					currentLength = 0;
				}

				const splitSegments = NotionRichTextSplitter.splitLongSegment(segment, maxChars);
				splitSegments.forEach((seg) => {
					blocks.push(NotionRichTextSplitter.createBlock([seg], blockType));
				});

				continue;
			}

			// If adding this segment exceeds limit, start new block
			if (currentLength + segmentLength > maxChars) {
				blocks.push(NotionRichTextSplitter.createBlock(currentRichText, blockType));
				currentRichText = [segment];
				currentLength = segmentLength;
			} else {
				currentRichText.push(segment);
				currentLength += segmentLength;
			}
		}

		if (currentRichText.length > 0) {
			blocks.push(NotionRichTextSplitter.createBlock(currentRichText, blockType));
		}

		return blocks;
	}

	// Helper method to split a single long segment
	private static splitLongSegment(segment: any, maxChars: number): any[] {
		const text = segment.text.content;
		const segments: any[] = [];

		let start = 0;
		while (start < text.length) {
			let end = start + maxChars;

			if (end < text.length) {
				const lastSpace = text.lastIndexOf(' ', end);
				if (lastSpace > start) {
					end = lastSpace;
				}
			}

			const chunk = text.slice(start, end);
			segments.push({
				...segment,
				text: {
					...segment.text,
					content: chunk,
				},
			});

			start = end + 1;
		}

		return segments;
	}

	// Helper method to create a Notion block
	private static createBlock(richText: any[], blockType: string): any {
		return {
			object: 'block',
			type: blockType,
			[blockType]: {
				rich_text: richText,
			},
		};
	}

	// Helper method to chunk array
	private static chunkArray(array: any[], size: number): any[][] {
		const chunks: any[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}
}
