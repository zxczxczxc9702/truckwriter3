# Implementation Plan - Naver Blog Automation Improvements

## Goal Description
Enhance the TruckWriter application by improving the user experience for image insertion and increasing the reliability of the Naver Blog automation script.
1.  **Frontend**: Allow users to insert images at the current cursor position in the content editor, rather than always appending to the end.
2.  **Automation**: Improve the success rate of title entry and image uploads by adding verification steps and better wait conditions.

## User Review Required
> [!NOTE]
> The frontend change involves converting the Preview Modal's content display from a read-only `<pre>` block to an editable `<textarea>`. This allows users to fine-tune the generated content and place their cursor exactly where they want images to appear.

## Proposed Changes

### Frontend
#### [MODIFY] [page.tsx](file:///c:/Users/USER/.gemini/antigravity/scratch/src/app/create/page.tsx)
- **Preview Modal**:
    - Replace the `<pre>` tag displaying `preview.content` with a `<textarea>`.
    - Bind this textarea to `preview.content` state.
    - Add a `ref` to this textarea to track cursor position.
    - Track `selectionStart` on click/keyup/blur.
- **Image Insertion**:
    - Update the "Insert to Content" button handler.
    - Instead of appending `<<DETAIL_N>>` to the end, insert it at the tracked `selectionStart` index.
    - If no cursor position is tracked (e.g. user hasn't clicked in the textarea yet), fallback to appending to the end.

### Automation Library
#### [MODIFY] [naver-blog-automation.ts](file:///c:/Users/USER/.gemini/antigravity/scratch/src/lib/naver-blog-automation.ts)
- **Title Input**:
    - Add a verification step after setting the title. Read back the value from the DOM to ensure it was applied.
    - If verification fails, retry using a fallback method (e.g., simulated typing vs. JS injection).
- **Image Upload**:
    - After `imageInput.sendKeys(absPath)`, add a wait condition.
    - Wait for the number of images in the editor to increase or for a specific "uploading" indicator to disappear.
    - This prevents the script from moving on too quickly before the image is actually inserted.

## Verification Plan

### Automated Tests
- **Unit/Integration**: Run the automation script with a mock blog ID (or real one if credentials provided) to verify title and image insertion.
    - `npx tsx src/lib/test-automation.ts` (Need to create this or use existing if available)

### Manual Verification
1.  **Frontend Image Insertion**:
    - Go to `/create`.
    - Fill out the form and click "Generate".
    - In the Preview Modal, click somewhere in the middle of the text.
    - Click "Insert to Content" for an uploaded image.
    - Verify the `<<DETAIL_N>>` tag appears at the cursor position.
    - Verify the text is editable.

2.  **Automation**:
    - Run the full flow with the "Publish" button.
    - Check if the title is correctly entered in Naver Blog.
    - Check if images are inserted at the correct positions relative to the text.
