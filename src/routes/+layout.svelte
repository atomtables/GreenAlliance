<script lang="ts">
	import '../app.css';
    import { page } from '$app/state';

	let { data, children } = $props();
    let { user, session } = data;

    console.log(user);

    let url = $derived(page.url.pathname);
</script>

<style lang="postcss">
    @reference "tailwindcss";

    .tab {
        @apply py-4 px-5 font-bold text-gray-800 dark:text-gray-300 hover:text-inherit hover:bg-neutral-500/40 active:bg-neutral-400/40 cursor-pointer transition-all duration-300;
    }
    .tab.current-tab {
        @apply py-4 px-5 text-inherit bg-neutral-500/40 border-b-2 font-bold hover:bg-neutral-400/40 active:bg-neutral-300/40 cursor-pointer transition-all;
    }
</style>

{#if user == null}
    <style lang="postcss">
        @reference "tailwindcss";

        .auth {
            display: none!important;
        }
        .noauth {
            display: block!important;
        }
    </style>
{:else}
    <style>
        .auth {
            display: block!important;
        }
        .noauth {
            display: none!important;
        }
    </style>
{/if}

<header class="flex flex-col">
    <div class="flex items-center justify-center relative p-5 bg-green-400 dark:bg-green-700">
        <div class="text-center w-full font-bold text-xl">
            THE GREEN ALLIANCE
        </div>
        <div class="absolute right-5 bottom-5">
            {#if user != null}
                {user.firstName} {user.lastName}
            {:else}
                Not logged in
            {/if}
        </div>
    </div>
    <div class="bg-green-300 dark:bg-green-800 flex flex-row flex-nowrap overscroll-x-auto justify-center">
        <a class="tab {url === '/' && 'current-tab'} noauth" href="/">
            HOME
        </a>
        <a class="tab {url === '/' && 'current-tab auth block'} hidden" href="/">
            LANDING
        </a>
        <a class="tab {url === '/home' && 'current-tab'} auth" href="/home">
            HOME
        </a>
        <a class="tab {url === '/about' && 'current-tab'} noauth" href="/about">
            ABOUT
        </a>
        <a class="tab {(url === '/account/signin' || url === '/account/signup') && 'current-tab'} noauth" href="/account/signin">
            ACCOUNT
        </a>
    </div>
</header>
{@render children()}
