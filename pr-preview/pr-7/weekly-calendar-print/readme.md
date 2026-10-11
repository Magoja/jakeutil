# Calendar Print

Prompt:
```
I'd like to make a simple calendar printing web tool. This is to write down some reminders each day. Here are requirements:
- Provide weekly, monthy option.
- Starts with Sunday or Monday, provide an option
- Vertical or Horizontal option
- Use US holiday as a small note.
- A quick ui to choose when month/ week to print.
- Show a preview.
- Push button to print.
- As a simple web page with html css js.

Let's create an entry point `index.html` in `calendar-print` folder

Could you add a popup UI to choose month/week? It should show the today's month calendar, based on month/ week selection it should the highlight for the selection. Shows 3 months and arrow buttons to choose next/ prev month. Put the default selection for this month and current week (if it is week option)
```

```
I think the generated code is collecting garbages. Let's start over.

Here is requirements:
- This page would make clean horizontal's alighed a week calendar that I can print and write reminders for each day. Start with Sunday.
- When I open this page, it shows calendar based on the current system date, and ready to print.
- The page also provide left and right arrow button to move to next or previous week. It could be as web arguments or JS script whichever easier.
- When I print, it should be beautifully aligned in a single page.

It's good start. Let's give some style.

I don't need Year. Aug-XX style should be good
We need highlight for Sunday and Saturday as usual Red and Blue color
Enough space for each day. I'd like to have vertical style, and 1 column row 0 start with title, "Weekly Calendar of Aug XX", Wednesday. Row 1 would be Sunday and Thursday. Does it make sense?
Weekday, I'd like to have stylish character.
Each box had few guidelines to write
Entire page should stretch to fit the entire page
```