i couldn’t sleep during the power outage last week so i made “notion for jobs”

### introducing coco, your personal co-op coordinator: an ai agent that helps you track, organize and plan.

**user flow:**

- find a job you like? navigate to that page - and save everything you need from it in one click. let coco autofill the necessary information - or choose to manually input it yourself.
- coco automatically gives your jobs relevant categories and organizes them into folders, making the list easy to navigate. click on the “my jobs” view: you’ll see all your folders separated by status and within them, the full job description with functional CRUD operations.
- now with all your jobs stored and organized for use whenever - what should you work on to get you there? that’s when you use coco’s resume analyzer feature. simply upload a pdf of your resume and receive an immediate plan of action based on your resume + job wishlist.

**features:**

- clean ui/ux with smooth animations and stress-alleviating design
- essential CRUD operations + 3 basic ai additions to reduce time, effort and friction
- seamless user workflow and functional navigation through tabs.

**tech stack:**

- built with html, tailwind css, and javascript + sweetalert.
- data stored and collected in the extension using the chrome api
- ai features powered by claude ♡

**how to use:**

1. clone this repo
2. go to chrome://extensions/
3. make sure "developer mode" is switched on
4. click "load unpacked" and upload the coco folder
5. pin the extension, and use it!

**ups and downs:**

- my favourite part was designing the ui/ux. my goal was to keep it as minimal as possible, easy on the eyes and also stress-reducing in a way. also loved not having to deal with multiple breakpoints - pros of chrome extensions!
- implementing the basic saving functions and CRUD operations with chrome api was straightforward - but figuring how to implement claude ai inside the extension was not ☹︎. the first thing was deciding WHAT to do with ai, so i spent a couple days actually using the most basic version to try and track jobs, and noticed that autofill, auto-categorize and resume analyzer were the three i wanted to focus on. very good to help me learn api integration!
- i hope to deploy this on the chrome store for all to use! what drove me to make this extension was feeling like applying to jobs was 1. stressful 2. all over the place. of course i could use a spreadsheet, or notion (including their chrome extension). but i also wanted there to be an extra aspect of simplicity and aesthetics, that would not only reduce friction when searching for and applying to jobs but creating a positive vibe that i just felt like i needed tbh

**thanks!**

i encourage you to try it out, and give me feedback! you can contact me at f26wu[at]uwaterloo[dot]ca ♡ thanks for stopping by and checking out coco, have a great day :)
