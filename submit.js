document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const imageInput = document.getElementById('productImage');
    const preview = document.getElementById('preview');
    const statusMsg = document.getElementById('statusMsg');
    const submitBtn = document.getElementById('submitBtn');

    // 1. IMAGE PREVIEW
    // Shows the user the photo they selected immediately
    imageInput.onchange = function () {
        const [file] = this.files;
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = 'block';
        }
    };

    // 2. FORM SUBMISSION
    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Get form values
        const name = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const category = document.getElementById('productCategory').value;
        const description = document.getElementById('productDescription').value;
        const imageFile = imageInput.files[0];

        // Basic Validation
        if (!imageFile) {
            alert("Please select an image file.");
            return;
        }

        // UI Feedback: Disable button to prevent double-clicks
        submitBtn.innerText = "Uploading... ⏳";
        submitBtn.disabled = true;
        statusMsg.innerText = "Saving your product to Golem Store...";
        statusMsg.style.color = "blue";

        try {
            // STEP A: Upload Image to Supabase Storage
            // We create a unique name using Date.now() to avoid overwriting files
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await _supabase.storage
                .from('product-images')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            // STEP B: Get the Public URL of the image
            const { data: urlData } = _supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            const publicImageUrl = urlData.publicUrl;

            // STEP C: Insert Product Data into Database
            const { error: dbError } = await _supabase
                .from('products')
                .insert([{
                    name: name,
                    price: parseFloat(price),
                    category: category,
                    description: description,
                    image: publicImageUrl,
                    status: 'pending' // Admin must approve this in the admin panel
                }]);

            if (dbError) throw dbError;

            // SUCCESS!
            statusMsg.innerText = "Success! Redirecting...";
            statusMsg.style.color = "green";
            alert("Product submitted! It will appear on the shop once an admin approves it.");
            window.location.href = 'index.html';

        } catch (err) {
            console.error("Submission Error:", err);
            statusMsg.innerText = "Error: " + err.message;
            statusMsg.style.color = "red";
            submitBtn.innerText = "Submit Product";
            submitBtn.disabled = false;
        }
    });
});
