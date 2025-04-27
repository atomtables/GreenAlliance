<script>
    let {children, onclick, class: className, type, disabled, transparent} = $props();

    const handleClick = () => {
        onclick?.(new CustomEvent(`onClickButton-${name}`));
    };
</script>

<button {type} class="grid place-items-center px-5 py-2 {disabled ? `cursor-not-allowed ${!transparent && 'dark:bg-neutral-700 bg-green-200'} text-gray-300` : `cursor-pointer ${!transparent ? 'dark:bg-green-700 dark:hover:bg-green-600 dark:active:bg-green-500 bg-green-300 hover:bg-green-400 active:bg-green-500' : 'hover:bg-neutral-500/25 active:bg-neutral-500/50'}`} uppercase font-bold transition-all flex flex-row {className}" onclick={handleClick}>
    {@render children()}
</button>