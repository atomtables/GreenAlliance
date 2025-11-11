<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import Input from "$lib/components/Input.svelte";

    let loading = $state(false);
    let { form } = $props();
</script>

<div class="pt-24">
    <form method="POST" class="mx-auto w-max dark:bg-green-900 bg-green-200">
    <div class="p-5 text-4xl font-bold dark:bg-green-800 bg-green-300">
        Sign in
    </div>
    <div class="p-5">
        <Input name="Username" type="text" id="username"/>
        <Input name="Password" type="password" id="password"/>
        <div class="text-sm dark:text-red-300 text-red-700 max-w-96">
            {form?.error}
        </div>
    </div>
    <div class="p-5 dark:bg-green-800 bg-green-300">
        <Button type="submit" disabled={loading} onclick={() => loading = true}>
            {#if loading}Loading...{/if}
            {#if !loading}Sign in{/if}
        </Button>
        <div class="pt-5">
            <div class="text-sm">
                Forgot your password? <a href="/account/reset_password" class="underline">Reset it</a>
            </div>
            <div class="text-sm pt-2">
                Don't have an account? <a href="/account/signup" class="underline">Create an account!</a>
            </div>
        </div>
    </div>
</form>
</div>