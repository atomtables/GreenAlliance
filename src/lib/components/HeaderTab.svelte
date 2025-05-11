<script>
    import {page} from "$app/state";
    import {slide} from "svelte/transition";
    import Spinner from "$lib/components/Spinner.svelte";
    import HeaderTabHelper from "./HeaderTab.helper.svelte";
    import {goto} from "$app/navigation";

    let {href, activeUrl, name, isDropdown, elements, class: className, showOnAuth, custom} = $props();
    let url = $derived(page.url.pathname);

    let dropdownActive = $state(false)

    const hlpr = url => {
        if (href === "/") {
            return url === href;
        }
        return true;
    }

    let resolving = $state(false);

    const handleClick = async () => {
        if (resolving) return;

        resolving = true;
        await goto(href);
        resolving = false;
    };
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
    <div
            class="font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 {dropdownActive && '!bg-neutral-400/40 !text-inherit'} cursor-pointer transition-all {((url?.includes(href) || url?.includes(activeUrl)) && hlpr()) && 'current-tab'} {!custom && (showOnAuth ? 'auth' : 'noauth')} {className}">
        <button class="block py-4 px-5 uppercase" onclick={() => dropdownActive = !dropdownActive}>{name}</button>
        {#if dropdownActive}
            <span class="absolute flex flex-col bg-gray-200 dark:bg-gray-800 text-left z-49" transition:slide={{axis: 'y'}}>
                {#each elements as {name, url: u}}
                    <HeaderTabHelper {u} {name} condition={u?.includes(url) && hlpr(u)}
                                     onLoad={() => dropdownActive = !dropdownActive}/>
                {/each}
            </span>
        {/if}
    </div>
{:else}
    <button class="block tab uppercase {((url?.includes(href) || url?.includes(activeUrl)) && hlpr(url)) && 'current-tab'} {!custom && (showOnAuth ? 'auth' : 'noauth')} {className}"
            onclick={() => handleClick()}>
        <span class="flex flex-row space-x-2">
            {#if resolving}
                <Spinner size="24"/>
            {/if}
            {name}
        </span>
    </button>
{/if}