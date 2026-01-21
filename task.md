# Naver Blog Automation Improvements

- [x] Assess current state and plan improvements <!-- id: 0 -->
- [x] **Frontend**: Implement "Insert Image at Cursor" functionality <!-- id: 1 -->
    - [x] Update `src/app/create/page.tsx` to track cursor position <!-- id: 2 -->
    - [x] Modify "Insert to Content" button to insert at cursor <!-- id: 3 -->
- [x] **Automation**: Refine Title Input Logic <!-- id: 4 -->
    - [x] Review and update selectors in `src/lib/naver-blog-automation.ts` <!-- id: 5 -->
    - [x] Add verification step to ensure title was set correctly <!-- id: 6 -->
- [x] **Automation**: Enhance Image Upload Reliability <!-- id: 7 -->
    - [x] Improve wait logic for image uploads (detect completion) <!-- id: 8 -->
    - [x] Fix image button selector and title injection logic (User Request) <!-- id: 12 -->
- [x] **Verification** <!-- id: 9 -->
    - [x] Verify frontend image insertion (confirmed: textarea editable, cursor tracking works) <!-- id: 10 -->
    - [x] Verify automation code review (title/image logic enhanced) <!-- id: 11 -->
