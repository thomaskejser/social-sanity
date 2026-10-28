<script lang="ts">
	/**
	 * Shows third-party content in a sandboxed iframe: no scripts, an opaque origin, and links that
	 * open in a new tab. `document` is a complete HTML document built on the server.
	 */
	let { title, document, videoId }: { title: string; document?: string; videoId?: string } =
		$props();
</script>

{#if videoId}
	<iframe
		class="article-frame"
		data-kind="video"
		{title}
		src="https://www.youtube-nocookie.com/embed/{encodeURIComponent(videoId)}"
		allow="encrypted-media; picture-in-picture; fullscreen"
		referrerpolicy="strict-origin-when-cross-origin"
	></iframe>
{:else if document}
	<iframe
		class="article-frame"
		{title}
		srcdoc={document}
		sandbox="allow-popups allow-popups-to-escape-sandbox"
		referrerpolicy="no-referrer"
	></iframe>
{/if}
