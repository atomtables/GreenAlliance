<script>
    import Spinner from "$lib/components/Spinner.svelte";

    let {children, onclick, class: className, type, disabled, transparent, disableLoading} = $props();

    let resolving = $state(false);

    const handleClick = async () => {
        if (disabled || resolving) return;

        resolving = true;
        try {
            await Promise.resolve(onclick?.(new CustomEvent(`onClickButton-${name}`)));
        } finally {
            resolving = false;
        }
    };
</script>

<button {type}
        class="grid place-items-center px-5 py-2 {disabled ? `cursor-not-allowed ${!transparent && 'dark:bg-neutral-700 bg-green-200'} text-gray-300` : `cursor-pointer ${!transparent ? 'dark:bg-green-700 dark:hover:bg-green-600 dark:active:bg-green-500 bg-green-300 hover:bg-green-400 active:bg-green-500' : 'hover:bg-neutral-400/25 active:bg-neutral-400/50'}`} {resolving && !disableLoading && 'cursor-progress'} uppercase font-bold transition-all flex flex-row {className}"
        onclick={handleClick}>
    <span class="flex flex-row">
        {#if resolving && !disableLoading}
            <Spinner size="24" class="mr-2" onGreen={!transparent}/>
        {/if}
        {@render children()}
    </span>
</button>