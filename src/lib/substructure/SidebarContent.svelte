<script>
    import Button from "$lib/components/Button.svelte";
    import Dropdown from "$lib/components/Dropdown.svelte";

    /**
     * tabs = the icons and text that should show on the sidebar
     * contents = the title, description, view, and shelf that should show on the content
     * banner = temporary, this will be moved to contents
     * initial = initial number to start the tab at.
     */
    let {tabs, contents, banner, initial = 0} = $props();
    // the current tab the user is on
    let current = $state(initial);

    // the amount of pixels a user has scrolled so far
    let scrollY = $state(0);
    // the element where the user scrolls to see content
    let w = $state();
    // helper function to update the value of scrollY as the user scrolls the page
    const onscroll = _ => scrollY = w.scrollTop;
</script>

<div class="w-full h-full p-10">
    <div class="w-full h-full flex flex-row flex-nowrap border-2 border-gray-600 ">
        <div class="w-64 border-r-2 border-gray-600 bg-gray-600 shrink-0">
            {#each tabs as {name, icon}, ind}
                <button onclick={() => current = ind}
                        class="block grow w-full {ind === current ? 'bg-neutral-500/50' : 'hover:bg-neutral-500/25 active:bg-neutral-500/50'} uppercase font-bold py-5 px-2 text-lg flex items-center gap-2 transition-all">
                    <span class="material-symbols-outlined icons-fill text-xl -translate-y-0.25 pl-5 pr-5">{icon}</span>
                    {name}
                </button>
            {/each}
        </div>
        <div class="bg-gray-600/50 flex-1 grow-1 overflow-scroll" bind:this={w} {onscroll}>
            {#each contents as {title, description, content, shelf}, ind}
                {#if ind === current}
                    {#if banner}
                        <div class="relative w-full h-1/2 overflow-hidden">
                            <img
                                    src={banner}
                                    alt="banner"
                                    class="absolute inset-0 w-full h-full object-cover"
                                    style="transform: translateY({0.4 * scrollY}px); filter:sepia(1) hue-rotate(90deg);"
                            />
                            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-green-900"></div>
                        </div>
                    {/if}
                    <div class="">
                        <div class="-translate-y-27">
                            <h1 class="max-w-2xl m-auto font-bold text-5xl pt-2 pb-2 {!description && 'pb-3'}">{title}</h1>
                            {#if description}
                                <h4 class="max-w-2xl m-auto {shelf?.length > 0 ? 'pb-5' : 'pb-8'}">{description}</h4>
                            {/if}
                            {#if shelf && shelf.length > 0}
                                <div class="bg-green-700 p-2 mb-3 w-full">
                                    <div class="max-w-2xl mx-auto min-w-max flex flex-row space-x-2 overflow-visible flex-nowrap -translate-x-5">
                                        {#each shelf as { name, selections, action }}
                                            {#if selections}
                                                <Dropdown items={selections} onselect={action} buttonText={name} />
                                            {:else}
                                                <Button transparent onclick={action}>{name}</Button>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            <div class="max-w-2xl m-auto">{@render content()}</div>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>