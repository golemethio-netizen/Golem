const form = document.getElementById('productForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data: { user } } = await _supabase.auth.getUser();

    if (!user) {
        alert("Please login first!");
        window.location.href = 'login.html';
        return;
    }

    const newProduct = {
        name: document.getElementById('pName').value,
        price: document.getElementById('pPrice').value,
        image: document.getElementById('pImage').value,
        category: document.getElementById('pCategory').value,
        status: 'pending',
        submitted_by: user.email
    };

    const { error } = await _supabase.from('products').insert([newProduct]);

    if (!error) {
        document.getElementById('statusMsg').innerText = "Sent! Waiting for admin approval.";
        form.reset();
        // Here you would call your Telegram notify function
    } else {
        alert(error.message);
    }
});


///////////////////We need to change how the form handles the image. It now has to "Upload" the file first, get the URL, and then save the product.
async function handleSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value;
    const imageFile = document.getElementById('productImage').files[0]; // Get the file

    if (!imageFile) {
        alert("Please select an image!");
        return;
    }

    try {
        // 1. Generate a unique name for the image
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload the file to Supabase Storage
        const { data: uploadData, error: uploadError } = await _supabase.storage
            .from('product-images')
            .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // 3. Get the Public URL of the uploaded image
        const { data: urlData } = _supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        const publicImageUrl = urlData.publicUrl;

        // 4. Save the product to the Database with the new Image URL
        const { error: dbError } = await _supabase
            .from('products')
            .insert([{
                name: name,
                price: price,
                category: category,
                description: description,
                image: publicImageUrl, // This is the link we just created
                status: 'pending'
            }]);

        if (dbError) throw dbError;

        alert("Product submitted for approval!");
        window.location.href = 'index.html';

    } catch (err) {
        console.error("Error:", err.message);
        alert("Upload failed: " + err.message);
    }
}
