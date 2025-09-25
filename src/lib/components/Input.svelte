<script lang="ts">
    import {draw} from "svelte/transition";

    let {
        name,
        type = 'text',
        id = name,
        class: className = '',
        value = $bindable(),
        action = () => null,
        elements = [],
        ...attributes
    }: {
        name?: string,
        type?: string,
        id?: string,
        class?: string,
        value: any,
        action?: Function,
        elements?: string[],
        [key: string]: any,
        pattern?: string
    } = $props();

    let isFocused = $state(false);
    let hasText = $derived(type === 'date' || (value || (typeof value === "number" && value + 1)) && (value?.length > 0 || value + 1 >= 1))
</script>

<style>
    .floating-label {
        position: absolute;
        left: 12px;
        top: 1.4rem;
        pointer-events: none;
    }

    .input-container:focus-within .floating-label,
    .floating-label.up {
        top: 0.75rem;
        font-size: 0.75rem;
        transform: none;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
    }

    input[type=number] {
    -moz-appearance: textfield; /* For Firefox */
    appearance: textfield; /* Standard property for future compatibility */
    }
</style>
<div class="relative py-2 input-container w-full {className}">
    <label class="{type === 'date' && '-ml-0'} transition-all floating-label text-gray-400 {isFocused && 'text-green-400'} {hasText && 'up'}"
           for={id}>
        {name}
    </label>
    {#if type === "dropdown"}
        <select
                bind:value={value} name={id} {id} {...attributes}
                class="w-full px-3 pt-5 pb-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-base focus:outline-none focus:ring-2 focus:ring-green-500 transition-all {className}"
                onfocus={() => isFocused = true}
                onblur={() => isFocused = false}
        >
            <option></option>
            {#each elements as element, i}
                <option value={i}>{element}</option>
            {/each}
        </select>
    {:else if type === "checkbox"}
        <div class="w-min p-1 group cursor-pointer">
            <input
                    id={id}
                    type="checkbox"
                    bind:checked={value}
                    onclick={() => action()}
                    class="peer opacity-0 absolute z-10 cursor-pointer"
                    {...attributes}
            />
            <div class="w-4 h-4 transition-all duration-250
                border-2 border-gray-300 peer-checked:border-green-600 peer-checked:bg-green-600
                peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
                flex items-center justify-center group-hover:bg-green-600/40 cursor-pointer">
                {#if value}
                    <svg
                            viewBox="0 0 24 24"
                            class="w-4 h-4 text-white scale-100 peer-checked:scale-100"
                    >
                        <path in:draw={{duration: 150}}
                              fill="none"
                              stroke="currentColor"
                              stroke-width="3"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M5 13l4 4L19 7"
                        />
                    </svg>
                {/if}
            </div>
        </div>
    {:else}
        <input
                bind:value={value} {type} name={id} {id} {...attributes}
                class="w-full px-3 pt-5 pb-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-base focus:outline-none focus:ring-2 focus:ring-green-500 transition-all {className}"
                onfocus={() => isFocused = true}
                onblur={() => isFocused = false}
        />
    {/if}
</div>