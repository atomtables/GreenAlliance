<script lang="ts">
	import Spinner from "$lib/components/Spinner.svelte";

	type ButtonProps = {
		children: () => any;
		onclick?: (e: MouseEvent) => boolean | void | Promise<boolean | void>;
		class?: string;
		type?: "button" | "submit" | "reset";
		disabled?: boolean;
		transparent?: boolean;
		disableLoading?: boolean;
	};

	let {
		children,
		onclick,
		class: className = "",
		type = "button",
		disabled = $bindable(),
		transparent = false,
		disableLoading = false,
	}: ButtonProps = $props();

	let resolving = $state(false);

	const handleClick = async (e) => {
		if (disabled || resolving) return;

		resolving = true;
		try {
			if (typeof onclick === "function")
				await Promise.resolve(onclick?.(e));
		} finally {
			resolving = false;
		}
	};
</script>

<button
	{type}
	class="grid place-items-center px-5 py-2
    {disabled ? 'cursor-not-allowed ...' : 'cursor-pointer'}
    {!transparent &&
		!className.includes('bg-') &&
		'dark:bg-green-700 bg-green-300 hover:bg-green-400'} 
    {className}"
	onclick={handleClick}
>
	<span class="flex flex-row">
		{#if resolving && !disableLoading}
			<Spinner size={24} class="mr-2" />
		{/if}
		{@render children()}
	</span>
</button>
