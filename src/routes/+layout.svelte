<script>
    import '../app.css';
    import {page} from '$app/state';
    import HeaderTab from "$lib/components/HeaderTab.svelte";

    let {data, children} = $props();
    let {user, session} = data;

    console.log(user);

    let url = $derived(page.url.pathname);
    let showDropdown = $state(false);

</script>

{#if user == null}
    <style lang="postcss">
        @reference "tailwindcss";

        .auth {
            display: none;
        }

        .noauth {
            display: block;
        }
    </style>
{:else}
    <style>
        .auth {
            display: block;
        }

        .noauth {
            display: none;
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
    <div class="bg-green-300 dark:bg-green-800 flex flex-row flex-nowrap overflow-x-scroll justify-center">
        <HeaderTab name="Home" href="/" />
        <HeaderTab name="Landing" href="/" custom class="{url === '/' && 'current-tab auth block'} hidden" />
        <HeaderTab name="Home" href="/home" showOnAuth />
        <HeaderTab name="About" href="/about" />
        <HeaderTab name="Account" href="/account/signin" activeUrl="/account" />
        <HeaderTab name="Account" href="/account" showOnAuth />
        <HeaderTab name="Users" activeUrl="/users" showOnAuth isDropdown elements={[{name: "List Members", url: "/account"}, {name: "Add/Remove Members", url: "/account"}]} />
    </div>
</header>
{@render children()}
