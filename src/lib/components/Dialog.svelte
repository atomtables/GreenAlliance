<script>
    import Button from "$lib/components/Button.svelte";
    import {fade} from "svelte/transition";
    import {quadInOut} from "svelte/easing";

    let {open, title, description, actions, children} = $props();
</script>

{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50"
         transition:fade={{ delay: 50, duration: 150, easing: quadInOut }}>
        <div
                class="bg-neutral-800 shadow-xl w-full min-w-md max-w-2xl mx-4"
                role="dialog"
                aria-modal="true"
                transition:fade={{ duration: 150, easing: quadInOut }}
        >
            <div class="px-6 pt-5">
                <h2 class="text-2xl font-bold">{title}</h2>
                <h5 class="pt-0 font-semibold">{description}</h5>
            </div>

            <div class="px-6 py-2">
                {@render children()}
            </div>

            <div class="px-6 pb-4 pt-4 flex justify-end gap-2">
                {#each actions as {name, action, primary}}
                    <Button transparent={!primary} onclick={action}>
                        {name}
                    </Button>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in {
        animation: fade-in 0.2s ease-out;
    }
</style>