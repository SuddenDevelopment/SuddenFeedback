SuddenFeedback
==============

Requirements
============
1. Node
2. MongoDB

Getting Started
===============
1. start mongo /usr/local/mongodb/bin/mongod
2. insert record from default_report.json into suddenfeedback.reports
3. start app ./node app.js
4. point to the app from a browser http://localhost:3000
5. login to twitter from the app

Idea and task list in todo file.

General Concepts
================
1. Report
- A report combines an overall concept, exploration or monitoring of a subject
- Filter the noise, constantly show what's most important and sort by importance
- High information density, everything has meaning, borders, position, color 

2. Columns
- Columns are paths within the report scope, everything within the column is within that columns context
- Columns are intended to be compared between each other.
- Column context can differ based on word matching, or show diferent sides of other more complex analysis such as sentiment, complexity, or distance from a subject
- Columns always contain items as a the basic unit by default.
- The Hbar above the columns shows a distribution between the columns.
- Special columns can be aded and used for things such as Notes or presentations.
- Whatever Analysis that is chosen for a column as constantly summed in the column header.
- The distribution % is also shown in the column header, this matches the HBar above the columns.

3. Column Items
- If notes are added to items by a user the note will be added in the notes column.
- .Items are intended to be significant, If they are not significant enough to be displayed there is an issue in one of 3 areas: enough data, analysis for selecting items, report config.
- Item borders are updated to show which ones are new and which have been recently updated. Each column acts as a seperate bucket.
columns have a display limit and sort order, the server side decides which ones are worth sending to the UI based on that criteria.

4. Column Components
- Components can be added to a column and they stack from the bottom. Any space not used by components will be used for the items
- Components are more rigid, they can be things like maps, charts, dynamic lists, stats
- Components are a good place to display specific analysis, aggregate info from a column/context