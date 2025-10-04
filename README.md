# n8n-nodes-notion-rich-text-splitter

This is an n8n community node that helps you bypass Notion's 2,000 character limit for rich text blocks by automatically splitting and appending large rich text content to Notion pages.

## Features

- ✅ **Bypass Character Limits**: Automatically split rich text into multiple blocks (max 2,000 chars each)
- ✅ **Preserve Formatting**: Maintains all text annotations (bold, italic, colors, links, etc.)
- ✅ **Smart Splitting**: Splits on word boundaries to avoid breaking mid-word
- ✅ **Batch Processing**: Send up to 100 blocks per API request for efficiency
- ✅ **Rate Limiting**: Built-in delays between batches to avoid Notion API limits
- ✅ **Preview Mode**: Test splitting without actually appending to pages
- ✅ **Multiple Block Types**: Support for paragraphs, headings, quotes, and callouts

## Installation

### Community Nodes (Recommended)

1. Open your n8n instance
2. Go to **Settings** → **Community Nodes**
3. Click **Install**
4. Enter: `n8n-nodes-notion-rich-text-splitter`
5. Click **Install**
6. Restart n8n

### Manual Installation

```bash
# In your n8n installation directory
cd ~/.n8n
npm install n8n-nodes-notion-rich-text-splitter

# Restart n8n
n8n start
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/HalfDozen/n8n-nodes-notion-rich-text-splitter.git
cd n8n-nodes-notion-rich-text-splitter

# Install dependencies
npm install

# Build the node
npm run build

# Link for local development
npm link

# In your n8n directory
cd ~/.n8n
npm link n8n-nodes-notion-rich-text-splitter

# Restart n8n
n8n start
```

## Prerequisites

- n8n version 0.190.0 or higher
- Notion API credentials configured in n8n
- A Notion integration with appropriate permissions

## Operations

### 1. Append Rich Text

Splits and appends rich text content to a Notion page.

**Parameters:**
- **Page ID** (required): The Notion page ID to append to
- **Rich Text** (required): Notion rich text array (JSON format)
- **Max Characters Per Block**: Maximum chars per block (default: 1900)
- **Block Type**: Type of block to create (paragraph, heading, quote, callout)
- **Batch Size**: Number of blocks per API request (default: 100, max: 100)

**Additional Options:**
- **After Block ID**: Insert blocks after a specific block
- **Delay Between Batches**: Milliseconds to wait between requests (default: 300ms)

**Example Input:**
```json
{
  "pageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "richText": [
    {
      "type": "text",
      "text": {
        "content": "This is a very long text that exceeds 2000 characters..."
      },
      "annotations": {
        "bold": false,
        "italic": false,
        "strikethrough": false,
        "underline": false,
        "code": false,
        "color": "default"
      }
    }
  ]
}
```

**Output:**
```json
{
  "success": true,
  "pageId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "totalBlocksCreated": 5,
  "batchesSent": 1,
  "results": [...]
}
```

### 2. Split Rich Text Only

Preview how text will be split without appending to Notion.

**Parameters:**
- **Rich Text** (required): Notion rich text array (JSON format)
- **Max Characters Per Block**: Maximum chars per block (default: 1900)
- **Block Type**: Type of block to create

**Output:**
```json
{
  "blocks": [...],
  "blockCount": 5,
  "preview": [
    {
      "length": 1895,
      "preview": "This is the first block content..."
    },
    {
      "length": 1823,
      "preview": "This is the second block content..."
    }
  ]
}
```

## Use Cases

### 1. Translate and Append Long Text

```
Webhook → DeepL Translation → Format Rich Text → Notion Rich Text Splitter → Response
```

### 2. Import Large Documents

```
HTTP Request (Fetch Document) → Parse Content → Notion Rich Text Splitter → Notion
```

### 3. AI-Generated Content

```
OpenAI → Format Rich Text → Notion Rich Text Splitter → Notion
```

## Rich Text Format

The node expects Notion's rich text array format:

```json
[
  {
    "type": "text",
    "text": {
      "content": "Hello world",
      "link": null
    },
    "annotations": {
      "bold": false,
      "italic": false,
      "strikethrough": false,
      "underline": false,
      "code": false,
      "color": "default"
    },
    "plain_text": "Hello world",
    "href": null
  }
]
```

### Supported Rich Text Types
- **text**: Regular text with annotations
- **mention**: User, page, or database mentions
- **equation**: LaTeX equations

### Supported Annotations
- Bold, Italic, Strikethrough, Underline
- Code formatting
- Colors: default, gray, brown, orange, yellow, green, blue, purple, pink, red
- Background colors

## Block Types

The node supports these Notion block types:

- **paragraph**: Regular text block
- **heading_1**: Top-level heading
- **heading_2**: Second-level heading
- **heading_3**: Third-level heading
- **quote**: Quote block
- **callout**: Callout block (with icon)

## Configuration Tips

### Optimal Max Characters

- **Default (1900)**: Safe buffer below 2000 limit
- **Conservative (1800)**: Extra safety for complex formatting
- **Aggressive (1950)**: Minimize blocks, slight risk

### Batch Size

- **Default (100)**: Maximum allowed by Notion API
- **Smaller (50)**: For rate-limited scenarios
- **Single (1)**: For sequential insertion with specific order

### Rate Limiting

Notion API limits:
- **Rate limit**: 3 requests per second
- **Recommended delay**: 300-500ms between batches

## Error Handling

The node handles these errors gracefully:

- **Invalid JSON**: Returns error with message
- **API Rate Limits**: Respects delays between batches
- **Authentication Errors**: Returns Notion API error
- **Invalid Page ID**: Returns Notion API error

Enable "Continue on Fail" in n8n to handle errors in workflows.

## Troubleshooting

### "Invalid rich text JSON format"
- Ensure the rich text input is valid JSON
- Check that it's an array of rich text objects

### "Rate limit exceeded"
- Increase the delay between batches
- Reduce batch size

### "Block not found"
- Verify the page ID is correct
- Check Notion integration permissions

### Blocks appear in wrong order
- Reduce batch size to 1
- Use the "After Block ID" parameter

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode (development)
npm run dev

# Lint
npm run lint

# Format
npm run format
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[MIT](LICENSE)

## Support

- **Issues**: [GitHub Issues](https://github.com/HalfDozen/n8n-nodes-notion-rich-text-splitter/issues)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)
- **Documentation**: [n8n Notion Integration](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.notion/)

## Changelog

### 1.0.0 (2025-10-03)
- Initial release
- Support for splitting and appending rich text
- Support for multiple block types
- Batch processing and rate limiting
- Preview mode for testing

## Related Resources

- [n8n Documentation](https://docs.n8n.io)
- [Notion API Reference](https://developers.notion.com/reference)
- [Notion Rich Text Format](https://developers.notion.com/reference/rich-text)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## Credits

Created by Create Something (micah@createsomething.io)

Inspired by the need to handle large text translations and AI-generated content in Notion workflows.
