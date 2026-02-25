// 1. Initialize variables for Edit Mode
const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('edit');
const form = document.getElementById('uploadForm');
const submitBtn = form.querySelector('button[type="submit"]');

// 2. If in Edit Mode, load existing data
if (editId) {
    loadEditData(editId);
}

async function loadEditData(id) {
    const { data: p, error } = await _supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (p) {
        document.getElementById('pName').value = p.name;
        document.getElementById('pPrice').value = p.price;
        document.getElementById('pPhone').value = p.phone_number;
        document.getElementById('pCat').value = p.category;
        submitBtn.innerText = "Update Item";
        
        // Show existing image preview
        const preview = document.getElementById('imagePreview');
        preview.src = p.image;
        preview.style.display = 'block';
    }
}

// 3. Image Preview Logic (Mobile Friendly)
document.getElementById('pImageFile').onchange = function () {
    const [file] = this.files;
    if (file) {
        const preview = document.getElementById('imagePreview');
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    }
};

// 4. Main Submit Logic (Handles both New and Edit)
form.onsubmit = async (e) => {
    e.preventDefault();
    
    // Disable button to prevent double clicks
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error("Please login first!");

        const fileInput = document.getElementById('pImageFile');
        let imageUrl = document.getElementById('imagePreview').src;

        // A. If a new file is selected, upload it to Supabase Storage
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await _supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = _supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        // B. Prepare the data object
        const productData = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            image: imageUrl,
            category: document.getElementById('pCat').value,
            phone_number: document.getElementById('pPhone').value,
            user_id: user.id,
            status: editId ? undefined : 'pending' // Only reset to pending for new items
        };

        // C. Database Action: Update or Insert
        let result;
        if (editId) {
            result = await _supabase
                .from('products')
                .update(productData)
                .eq('id', editId);
        } else {
            result = await _supabase
                .from('products')
                .insert([productData]);
        }

        if (result.error) throw result.error;

        // D. Optional: Send EmailJS notification here for new items
        // if (!editId) { sendEmailNotification(productData); }

        alert(editId ? "Item updated!" : "Success! Item sent for approval.");
        window.location.href = 'my-items.html';

    } catch (err) {
        alert("Error: " + err.message);
        submitBtn.innerText = editId ? "Update Item" : "Post for Approval";
        submitBtn.disabled = false;
    }
};
