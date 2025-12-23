# Maya Testing Lab - Quick Start Guide

## ✅ Setup Complete!

The testing lab is now fully set up with:
- ✅ Automatic database migration check
- ✅ Test user creation (separate from your admin account)
- ✅ Image upload functionality
- ✅ Safety checks to protect your admin model

## First Time Setup

### 1. Access the Testing Lab

Navigate to: **`/admin/maya-testing`**

The page will automatically:
- Check if database migration is needed
- Run migration if tables don't exist
- Show status indicators

### 2. Create a Test User

1. Click **"Create Test User"** button (top of Training tab)
2. A dedicated test user will be created: `maya-test-user@sselfie.test`
3. This user is completely separate from your admin account
4. Your admin account's production model will NOT be affected

### 3. Upload Test Images

1. Select the test user from the dropdown
2. Click **"Choose Files"** to upload training images
3. Upload 5-20 images (recommended: 10-15)
4. Images will be saved to the test user only
5. You'll see thumbnails of uploaded images

### 4. Configure Training Parameters

Adjust the recommended parameters:
- **LoRA Rank**: 24 (vs current prod: 48)
- **Learning Rate**: 0.0001 (vs current prod: 0.00008)
- **Caption Dropout Rate**: 0.05 (vs current prod: 0.15)

### 5. Run Training Test

1. Click **"Run Training Test"**
2. Training will start (takes ~10-15 minutes)
3. Progress automatically monitors every 5 seconds
4. Status updates in real-time

### 6. View Results

1. Check the **"Compare"** tab to see all test results
2. Compare different configurations
3. Identify which parameters work best

## Safety Guarantees

### ✅ Your Admin Model is Protected

- Test trainings use **separate Replicate model names** (`test-` prefix)
- Test images are saved to **test user only** (not admin user)
- Test models are stored in **separate database tables**
- Admin account is **excluded** from test user lists
- Multiple safety checks prevent accidental admin model usage

### ✅ Test User Isolation

- Test user: `maya-test-user@sselfie.test`
- Admin user: `ssa@ssasocial.com`
- These are completely separate accounts
- Test user has no production data

## Testing Workflow

### Recommended Test Sequence

1. **Test Current Production Parameters**
   - rank=48, lr=0.00008, dropout=0.15
   - Train model
   - Generate test images
   - Note results

2. **Test Recommended Parameters**
   - rank=24, lr=0.0001, dropout=0.05
   - Train model
   - Generate test images
   - Compare with production params

3. **Compare Results**
   - Check image quality
   - Check feature accuracy (hair, body, age)
   - Check training stability
   - Choose best configuration

## Cost Estimate

**Per Complete Test:**
- Training: ~$0.10-0.50 (one-time)
- Image Generation: ~$0.06-0.20 (20 images)
- **Total: ~$0.50-2.50**

**Testing Multiple Configurations:**
- 5 different parameter sets: ~$2.50-12.50
- Worth it to validate improvements before production

## Troubleshooting

### "Migration failed"
- Check database connection
- Verify you're logged in as admin
- Check browser console for errors

### "Cannot upload to admin user"
- This is a safety feature!
- Use the "Create Test User" button
- Select the test user for uploads

### "Test user not showing"
- Click "Create Test User" button
- Refresh the page
- Check that test user was created

### "Training not starting"
- Verify you uploaded 5+ images
- Check that test user is selected
- Verify Replicate API key is set

## Next Steps

After testing and finding optimal parameters:

1. Document the best configuration
2. Plan production rollout
3. Update `lib/replicate-client.ts` with new defaults
4. Monitor production results

The testing lab helps you validate changes safely before affecting production users!























