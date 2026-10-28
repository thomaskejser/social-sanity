function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Wraps an article's HTML in a standalone document for the sandboxed reader frame. Relative links
 * and images resolve against the article; scripts are blocked by both the sandbox and the CSP.
 */
export function readerDocument(contentHtml: string, articleUrl: string): string {
	return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'">
<base href="${escapeAttribute(articleUrl)}" target="_blank">
<style>
:root { color-scheme: light dark; }
body { font: 1.0625rem/1.6 system-ui, sans-serif; max-width: 65ch; margin: 1rem auto; padding: 0 1rem; }
img, video, iframe { max-width: 100%; height: auto; }
pre { overflow-x: auto; }
</style>
</head>
<body>
${contentHtml}
</body>
</html>`;
}
