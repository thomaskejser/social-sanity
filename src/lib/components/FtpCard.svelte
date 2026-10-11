<script lang="ts" module>
	export type FtpView = {
		protocol: 'ftp' | 'sftp';
		host: string;
		port: number;
		username: string;
		passwordEnvVar: string;
		encryption: 'explicit' | 'implicit' | 'none';
		remoteDir: string;
		publicUrl: string | null;
		hostKeyFingerprint: string | null;
		passwordSet: boolean;
		lastTestedAt: number | null;
		lastTestOk: boolean | null;
		lastTestMessage: string | null;
	};

	export type FtpFormState = {
		values: Record<string, string>;
		errors: Record<string, string | undefined>;
	};
</script>

<script lang="ts">
	import { ftpStatus } from '#lib/integrations/ftp-status.ts';
	import Alert from './Alert.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import DateTime from './DateTime.svelte';
	import Form from './Form.svelte';
	import RadioGroup from './RadioGroup.svelte';
	import SelectField from './SelectField.svelte';
	import TextField from './TextField.svelte';

	let { server, form }: { server: FtpView | null; form: FtpFormState | null } = $props();

	const PROTOCOL_OPTIONS = [
		{ value: 'ftp', label: 'FTP', description: 'Classic FTP, optionally over TLS (FTPS).' },
		{ value: 'sftp', label: 'SFTP', description: 'File transfer over SSH. Always encrypted.' }
	];

	const ENCRYPTION_OPTIONS = [
		{ value: 'explicit', label: 'FTPS — explicit TLS (recommended)' },
		{ value: 'implicit', label: 'FTPS — implicit TLS (usually port 990)' },
		{ value: 'none', label: 'None — plain FTP (unencrypted)' }
	];

	const status = $derived(ftpStatus(server));
	// After a failed save, show what the user typed; otherwise show the saved settings.
	const values = $derived(
		form?.values ?? {
			protocol: server?.protocol ?? 'ftp',
			host: server?.host ?? '',
			port: server ? String(server.port) : '',
			username: server?.username ?? '',
			passwordEnvVar: server?.passwordEnvVar ?? 'FTP_PASSWORD',
			encryption: server?.encryption ?? 'explicit',
			remoteDir: server?.remoteDir ?? '/',
			publicUrl: server?.publicUrl ?? ''
		}
	);
	const errors = $derived(form?.errors ?? {});
	// Follows the saved/submitted value, but the radio can switch it locally before saving.
	let protocol = $derived(values.protocol);
	const isSftp = $derived(protocol === 'sftp');
</script>

<article class="card" aria-labelledby="integration-ftp">
	<header>
		<h2 id="integration-ftp">File upload (FTP / SFTP)</h2>
		<Badge tone={status.tone}>{status.label}</Badge>
	</header>

	<p class="card-note">
		Upload media to your own server, e.g. so Instagram can fetch images from a public URL. The
		password is never stored: set it in an environment variable and enter the variable's name here.
	</p>

	{#if server && !server.passwordSet}
		<Alert tone="warn">
			<code>{server.passwordEnvVar}</code> is not set. Add it to <code>.env</code> (or the server environment)
			and restart the app.
		</Alert>
	{/if}
	{#if !isSftp && values.encryption === 'none'}
		<Alert tone="warn">Plain FTP sends your password and files unencrypted.</Alert>
	{/if}
	{#if server?.protocol === 'sftp' && server.hostKeyFingerprint}
		<p class="card-note">
			Pinned host key: <code>{server.hostKeyFingerprint}</code>
		</p>
	{/if}
	{#if server?.lastTestedAt}
		<p class="card-note">
			Last test (<DateTime epochMs={server.lastTestedAt} />): {server.lastTestMessage}
		</p>
	{/if}

	<Form action="?/saveFtp" label="File server settings" variant="settings" resetOnSuccess={false}>
		<RadioGroup
			legend="Protocol"
			name="protocol"
			options={PROTOCOL_OPTIONS}
			bind:value={protocol}
			error={errors.protocol}
		/>
		<TextField
			label="Host name or IP address"
			name="host"
			value={values.host}
			placeholder="ftp.example.com"
			required
			error={errors.host}
		/>
		<TextField
			label="Port"
			name="port"
			type="number"
			value={values.port}
			placeholder={isSftp ? '22' : '21'}
			hint="Leave empty for the default."
			error={errors.port}
		/>
		<TextField
			label="Username"
			name="username"
			value={values.username}
			autocomplete="off"
			required
			error={errors.username}
		/>
		<TextField
			label="Password environment variable"
			name="passwordEnvVar"
			value={values.passwordEnvVar}
			placeholder="FTP_PASSWORD"
			required
			hint="Name of the variable holding the password, e.g. FTP_PASSWORD."
			error={errors.passwordEnvVar}
		/>
		{#if !isSftp}
			<SelectField
				label="Encryption"
				name="encryption"
				options={ENCRYPTION_OPTIONS}
				value={values.encryption}
				error={errors.encryption}
			/>
		{/if}
		<TextField
			label="Remote directory"
			name="remoteDir"
			value={values.remoteDir}
			placeholder="/"
			hint="Created if it doesn't exist."
			error={errors.remoteDir}
		/>
		<TextField
			label="Public URL of that directory (optional)"
			name="publicUrl"
			type="url"
			value={values.publicUrl}
			placeholder="https://media.example.com/uploads"
			hint="Where uploaded files can be reached over HTTP(S). Required for Instagram media."
			error={errors.publicUrl}
		/>
		<footer>
			<Button type="submit">Save</Button>
			{#if server}
				<Button
					type="submit"
					action="secondary"
					formaction="?/testFtp"
					disabled={!server.passwordSet}
				>
					Test connection
				</Button>
				<Button type="submit" action="destructive" formaction="?/removeFtp">Remove</Button>
			{/if}
		</footer>
	</Form>
</article>
