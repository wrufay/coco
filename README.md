I couldn't sleep during the power outage last week so I made "Notion for jobs"

### Introducing Coco, your personal co-op coordinator: an AI agent that helps you track, organize and plan.

**User flow:**

- Find a job you like? Navigate to that page - and save everything you need from it in one click. Let Coco autofill the necessary information - or choose to manually input it yourself.

- Coco automatically gives your jobs relevant categories and organizes them into folders, making the list easy to navigate. Click on the "My Jobs" view: you'll see all your folders separated by status and within them, the full job description with functional CRUD operations.

- Now with all your jobs stored and organized for use whenever - what should you work on to get you there? That's when you use Coco's resume analyzer feature. Simply upload a PDF of your resume and receive an immediate plan of action based on your resume + job wishlist.

**Features:**

- Clean UI/UX with smooth animations and stress-alleviating design
- Essential CRUD operations + 3 basic AI additions to reduce time, effort and friction
- Seamless user workflow and functional navigation through tabs.

**Tech stack:**

- Built with HTML, Tailwind CSS, and JavaScript + SweetAlert.
- Data stored and collected in the extension using the Chrome API
- AI features powered by Claude ♡

**How to use:**

1. Clone this repo
2. Go to chrome://extensions/
3. Make sure "Developer mode" is switched on
4. Click "Load unpacked" and upload the Coco folder
5. Pin the extension, and use it!

**Ups and downs:**

- My favourite part was designing the UI/UX. My goal was to keep it as minimal as possible, easy on the eyes and also stress-reducing in a way. Also loved not having to deal with multiple breakpoints - pros of Chrome extensions!
- Implementing the basic saving functions and CRUD operations with Chrome API was straightforward - but figuring how to implement Claude AI inside the extension was not ☹︎. The first thing was deciding WHAT to do with AI, so I spent a couple days actually using the most basic version to try and track jobs, and noticed that autofill, auto-categorize and resume analyzer were the three I wanted to focus on. Very good to help me learn API integration!
- I hope to deploy this on the Chrome store for all to use! What drove me to make this extension was feeling like applying to jobs was 1. stressful 2. all over the place. Of course I could use a spreadsheet, or Notion (including their Chrome extension). But I also wanted there to be an extra aspect of simplicity and aesthetics, that would not only reduce friction when searching for and applying to jobs but creating a positive vibe that I just felt like I needed tbh

**Thanks!**

I encourage you to try it out, and give me feedback! You can contact me at f26wu[at]uwaterloo[dot]ca ♡ Thanks for stopping by and checking out Coco, have a great day :)
