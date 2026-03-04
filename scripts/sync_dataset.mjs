import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DATASET_DIR = path.join(__dirname, '../dataset');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function getAllImages(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllImages(file));
        } else {
            if (IMAGE_EXTS.includes(path.extname(file).toLowerCase())) {
                results.push(file);
            }
        }
    });
    return results;
}

// Get the lowest-level directory name before the file as the name
function getProfileName(filePath) {
    const parts = filePath.split(path.sep);
    return parts[parts.length - 2];
}

async function uploadPhotos() {
    console.log('🔄 Scanning dataset directory...');
    if (!fs.existsSync(DATASET_DIR)) {
        console.error(`Directory not found: ${DATASET_DIR}`);
        return;
    }

    const images = getAllImages(DATASET_DIR);
    console.log(`Found ${images.length} images to sync.`);

    let successCount = 0;
    let failCount = 0;

    for (const fullPath of images) {
        const profileName = getProfileName(fullPath);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(fullPath)}`;

        try {
            const fileBuffer = fs.readFileSync(fullPath);

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(fileName, fileBuffer, {
                    contentType: `image/${path.extname(fullPath).slice(1).replace('jpg', 'jpeg')}`,
                    upsert: false
                });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('profile-photos')
                .getPublicUrl(fileName);

            const photoUrl = urlData.publicUrl;

            // Check if profile exists
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('name', profileName)
                .single();

            if (existing) {
                // Update photo URL but DON'T override descriptor if already there
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ photo_url: photoUrl })
                    .eq('id', existing.id);

                if (updateError) throw new Error(updateError.message);
                console.log(`✅ [UPDATED] ${profileName} -> ${photoUrl}`);
            } else {
                // Insert new profile
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        name: profileName,
                        photo_url: photoUrl,
                        role_type: 'staff' // Default to staff
                    });

                if (insertError) throw new Error(insertError.message);
                console.log(`✅ [CREATED] ${profileName} -> ${photoUrl}`);
            }

            successCount++;
        } catch (err) {
            console.error(`❌ [ERROR] ${profileName}: ${err.message}`);
            failCount++;
        }
    }

    console.log(`\n=== DONE ===`);
    console.log(`✅ Successfully synced: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`\nNext Step: Go to the Admin dashboard and use 'Compute All Faces' to extract the descriptors!`);
}

uploadPhotos();
