<script lang="ts">
    import Button from "$lib/components/Button.svelte";
    import Dialog from "$lib/components/Dialog.svelte";
    import { goto } from "$app/navigation";
    import { onDestroy } from "svelte";

    let { data } = $props();

    let changeAvatarOpen = $state(false);
    let avatarUrl = $state(data.user?.avatar || "/noprofile.png");
    let selectedFile = $state<File | null>(null);
    let previewUrl = $state<string | null>(null);
    let uploadError = $state<string | null>(null);
    let uploading = $state(false);

    const clearPreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }
    };

    const handleFileChange = (event: Event) => {
        const target = event.currentTarget as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        selectedFile = file;
        clearPreview();
        previewUrl = URL.createObjectURL(file);
    };

    $effect(() => {
        if (!changeAvatarOpen) {
            clearPreview();
            selectedFile = null;
            uploadError = null;
        }
    });

    onDestroy(() => {
        clearPreview();
    });

    const saveProfilePicture = async () => {
        if (uploading) return;
        if (!selectedFile) {
            uploadError = "Please select an image to upload.";
            return;
        }
        uploading = true;
        uploadError = null;
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            const uploadRes = await fetch("/upload/profile-pictures", {
                method: "POST",
                body: formData,
            });
            const uploadData = await uploadRes.json().catch(() => ({}));
            if (!uploadRes.ok) {
                throw new Error(uploadData.error || "Failed to upload profile picture");
            }
            const token = uploadData.token as string;
            const avatarRes = await fetch("/api/users/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const avatarData = await avatarRes.json().catch(() => ({}));
            if (!avatarRes.ok) {
                throw new Error(avatarData.error || "Failed to save profile picture");
            }
            avatarUrl = avatarData.avatar || avatarUrl;
            changeAvatarOpen = false;
        } catch (e: any) {
            uploadError = e?.message || "Failed to update profile picture";
        } finally {
            uploading = false;
        }
    };
</script>

<div class="p-6 flex flex-col gap-6">
    <div class="flex items-center gap-4">
        <img src={avatarUrl || "/noprofile.png"} alt="avatar" class="h-16 w-16 rounded-full object-cover bg-gray-700" />
        <Button onclick={() => (changeAvatarOpen = true)}>Change profile picture</Button>
    </div>
    <Button onclick={() => { goto("/account/logout"); }}>sign out</Button>
</div>

<Dialog
    bind:open={changeAvatarOpen}
    title="Change profile picture"
    description=""
    actions={[
        { name: "Cancel", action: () => null, close: true },
        { name: uploading ? "Uploading..." : "Upload", action: saveProfilePicture, primary: true },
    ]}
>
    <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
            <img src={previewUrl || avatarUrl || "/noprofile.png"} alt="Profile preview" class="h-20 w-20 rounded-full object-cover bg-gray-700" />
            <div class="text-sm text-neutral-300">Selected images will be re-encoded to PNG.</div>
        </div>
        <input type="file" accept="image/*" onchange={handleFileChange} class="block w-full text-sm text-neutral-200 file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-gray-600" />
        {#if uploadError}
            <div class="text-sm text-red-300">{uploadError}</div>
        {/if}
    </div>
</Dialog>
