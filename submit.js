document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.innerText = "Uploading...";
    submitBtn.disabled = true;

    const file = document.getElementById('pImageFile').files[0];
    const { data: { user } } = await _supabase.auth.getUser();

    try {
        // 1. Generate a unique file name
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `uploads/${fileName}`;

        // 2. Upload to Supabase Storage
        const { error: uploadError } = await _supabase.storage
            .from('product-images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 3. Get the Public URL
        const { data: { publicUrl } } = _supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // 4. Save Product to Database
        const productData = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            image: publicUrl, // The link to the file we just uploaded
            category: document.getElementById('pCat').value,
            phone_number: document.getElementById('pPhone').value,
            user_id: user.id,
            status: 'pending'
        };

        const { error: dbError } = await _supabase.from('products').insert([productData]);
        if (dbError) throw dbError;

        alert("Item posted successfully for approval!");
        window.location.href = 'index.html';

    } catch (err) {
        alert("Error: " + err.message);
        submitBtn.innerText = "Post for Approval";
        submitBtn.disabled = false;
    }
};

  

   
