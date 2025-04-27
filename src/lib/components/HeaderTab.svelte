<script>
    import {page} from "$app/state";
    import {slide} from "svelte/transition";

    let {href, activeUrl, name, isDropdown, elements, class: className, showOnAuth, custom} = $props();
    let url = $derived(page.url.pathname);

    let dropdownActive = $state(false)

    const hlpr = () => {
        if (href === "/") {
            return url === href;
        }
        return true;
    }
</script>

<style lang="postcss">
    @reference "tailwindcss";

    .tab {
        @apply py-4 px-5 font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 cursor-pointer transition-all;
    }

    .current-tab {
        @apply text-inherit bg-neutral-500/40 border-b-2 font-bold hover:bg-neutral-400/40 active:bg-neutral-300/40 cursor-pointer transition-all;
    }
</style>

{#if isDropdown}
    <button onclick={() => dropdownActive = !dropdownActive}
            class="font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 {dropdownActive && '!bg-neutral-400/40 !text-inherit'} cursor-pointer transition-all {((url?.includes(href) || url?.includes(activeUrl)) && hlpr()) && 'current-tab'} {!custom && (showOnAuth ? 'auth' : 'noauth')} {className}">
        <span class="block py-4 px-5 uppercase">{name}</span>
        {#if dropdownActive}
            <span class="absolute flex flex-col bg-gray-200 dark:bg-gray-800 text-left z-49" transition:slide={{axis: 'y'}}>
                {#each elements as {name, url: u}}
                    <a class="uppercase py-4 px-5 font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 cursor-pointer transition-all {u.includes(url) && 'bg-neutral-400/40 !text-inherit'} auth"
                       href={u} >
                        {name}
                    </a>
                {/each}
            </span>
        {/if}
    </button>
{:else}
    <a class="block tab uppercase {((url?.includes(href) || url?.includes(activeUrl)) && hlpr()) && 'current-tab'} {!custom && (showOnAuth ? 'auth' : 'noauth')} {className}" href="{href}">
        {name}
    </a>
{/if}