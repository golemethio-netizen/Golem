document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('productImage');
    const preview = document.getElementById('preview');

    // 1. Image Preview Logic
    imageInput.onchange = function () {
        const [file] = this.files;
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        }
    };

    // 2. Form Submission Logic
    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const statusMsg = document.getElementById('statusMsg');
        
        // Grab values
        const name = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const category = document.getElementById('productCategory').value;
        const description = document.getElementById('productDescription').value;
        const imageFile = imageInput.files[0];

        // UI Feedback
        submitBtn.innerText = "Uploading... Please wait";
        submitBtn.disabled = true;
        statusMsg.innerText = "Processing your request...";

        try {
            // STEP A: Upload Image to Storage Bucket
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`; // Unique filename
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await _supabase.storage
                .from('product-images')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            // STEP B: Get the Public URL for the image
            const { data: urlData } = _supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            const publicImageUrl = urlData.publicUrl;

            // STEP C: Insert record into 'products' table
            const { error: dbError } = await _supabase
                .from('products')
                .insert([{
                    name: name,
                    price: parseFloat(price),
                    category: category,
                    description: description,
                    image: publicImageUrl,
                    status: 'pending' // Admin must approve this
                }]);

            if (dbError) throw dbError;

            // SUCCESS
            alert("Success! Your product is pending admin approval.");
            window.location.href = 'index.html';

        } catch (err) {
            console.error("Submission Error:", err);
            statusMsg.innerText = "Error: " + err.message;
            statusMsg.style.color = "red";
            submitBtn.innerText = "Submit for Approval";
            submitBtn.disabled = false;
        }
    });
});
