<script lang="ts">
    import Spinner from "$lib/components/Spinner.svelte";
    import {goto} from "$app/navigation";

    let {u, name, condition, onLoad} = $props();

    let resolving:boolean = $state(false);

    const handleClick = async (e) => {
        if (resolving) return;

        resolving = true;
        await goto(u);
        resolving = false;
        onLoad?.();
    };
</script>

<button class="uppercase py-4 px-5 font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 cursor-pointer transition-all {condition && 'bg-neutral-400/40 !text-inherit'} auth"
        onclick={e => handleClick(e)}>
    <span class="flex flex-row">
        {#if resolving}
            <Spinner size={24}/>
            <span class="px-1"></span>
        {/if}
        {name}
    </span>
</button>