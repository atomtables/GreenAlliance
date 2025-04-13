<script>
    let {children, onClick, className, type, disabled} = $props();

    const handleClick = () => {
        onClick?.(new CustomEvent(`onClickButton-${name}`));
    };
</script>

<button {type} class=" px-5 py-2 {disabled ? 'cursor-not-allowed dark:bg-neutral-700 bg-green-200 text-gray-300' : 'cursor-pointer dark:bg-green-700 dark:hover:bg-green-600 dark:active:bg-green-500 bg-green-300 hover:bg-green-400 active:bg-green-500'} uppercase font-bold  transition-all  {className}" onclick={handleClick}>
    {@render children()}
</button>