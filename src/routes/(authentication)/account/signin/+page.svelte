<script>
    import Button from "$lib/components/Button.svelte";
    import {enhance} from "$app/forms";
    import {onMount} from "svelte";

    let loading = $state(false);
    let { form } = $props();

    let handleEnhance = $state();
    onMount(() => {
        handleEnhance = enhance((opts) => {
            loading = true;

            return async ({ result, update }) => {
                loading = false;
                update(result);
            };
        });
    })
</script>

<form method="POST" class="mx-auto mt-24 w-max dark:bg-green-900 bg-green-200" use:handleEnhance>
    <div class="p-5 text-4xl font-bold dark:bg-green-800 bg-green-300">
        Sign in
    </div>
    <div class="p-5">
        <div class="flex flex-col py-2 w-96">
            <label for="username" class="text-sm">Username</label>
            <input type="text" name="username" id="username" placeholder="defaultuser0"
                   class="bg-gray-100 text-xl dark:bg-gray-900 border-none m-0 mt-1"/>
        </div>
        <div class="flex flex-col py-2 w-96">
            <label for="password" class="text-sm">Password</label>
            <input type="password" name="password" id="password" placeholder="***********"
                   class="bg-gray-100 text-xl dark:bg-gray-900 border-none m-0 mt-1">
        </div>
        <div class="text-sm dark:text-red-300 text-red-700 max-w-96">
            {form?.error}
        </div>
    </div>
    <div class="p-5 dark:bg-green-800 bg-green-300">
        <Button type="submit" disabled={loading}>
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