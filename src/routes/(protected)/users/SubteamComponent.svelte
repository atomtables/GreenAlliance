<script lang="ts">
    /** throwaway component because snippets don't hold their water (each can't have state) */
    import Dropdown from "$lib/components/Dropdown.svelte";
    import Button from "$lib/components/Button.svelte";
    import {translateRole} from "$lib/components/User.svelte";
    import {slide} from "svelte/transition";
    import type {User} from "$lib/types/types.ts"

    let { subteam, users }: {
        subteam: string,
        users: User[]
    } = $props()
    let display = $state(true);
</script>

{#snippet writeuser({firstName, lastName, avatar, role, subteam, email})}
    <div class="bg-slate-700 py-2 px-2 flex flex-row space-x-2 items-center">
        <div class="avatar shrink-0 flex items-center">
            {#if avatar}
                <img src="{avatar}" alt="avatar" class="w-10 h-10 rounded-full"/>
            {:else}
                <img src="/noprofile.png" alt="avatar" class="w-10 h-10 rounded-full"/>
            {/if}
        </div>
        <div class="flex flex-col justify-center">
            <div class="text-base font-bold truncate">
                {firstName} {lastName}
            </div>
            <div class="text-sm">
                {translateRole(role)} - {subteam} - {email}
            </div>
        </div>
        <div class="grow"></div>
        <div class=" hover:bg-neutral-500/25 active:bg-neutral-500/50 grid place-items-center transition-colors">
            <Dropdown onselect={()=>null} items={["Contact Leads"]}/>
        </div>
    </div>
{/snippet}

<div class="w-full bg-slate-800 {display ? 'py-3' : 'pt-3'} px-2 transition-all">
    <div class="flex flex-row items-end">
        <div class="text-2xl font-bold pb-2">
            Subteam: {subteam}
        </div>
        <div class="text-sm pl-2 pb-2.75">
            {users.length} member{users.length !== 1 ? 's' : ''}
        </div>
        <div class="grow"></div>
        <div class="grow"></div>
        <div class="flex flex-row">
            <Button
                    transparent
                    class="[&]:px-0 !py-1 mb-2 hover:bg-neutral-500/25 active:bg-neutral-500/50 grid place-items-center transition-colors"
                    onclick={() => display = !display}
            >
                <span class="material-symbols-outlined icons-fill text-xl">arrow_drop_down</span>
            </Button>
            <Dropdown onselect={()=>null} items={["Change subteam", "Contact"]} class="!py-1 mb-2"/>
        </div>
    </div>
    {#if display}
        <div transition:slide={{ duration: 250 }}>
            {#if users.length > 0}
                {#each users as user}
                    {@render writeuser(user)}
                {/each}
            {:else}
                <div>There are no members in this subteam</div>
            {/if}
        </div>
    {/if}
</div>