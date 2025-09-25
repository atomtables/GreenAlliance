<script lang="ts">
    import Button from "./Button.svelte";
    import Dialog from "./Dialog.svelte";

    let {
        children,
        onclick,
        class: className = "",
        type = "button", 
        disabled = $bindable(), 
        transparent = false, 
        disableLoading = false
    } = $props();
</script>

<Button {onclick} class="!p-2 !rounded-full {className}">
    <div class="material-symbols-outlined icons-fill !text-sm !flex !items-center">
        {@render children()}
    </div>
</Button>