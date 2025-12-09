const signin = async ( request, username = process.env.MOD_USER, password = process.env.MOD_PASS ) => {

    // Login using application/x-www-form-urlencoded
    const body = new URLSearchParams({ username, password }).toString();
    const reponse = await request.post("/api/users/signin", {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: body
    });

    return reponse;

}

export { signin };