**SmartVision Coding Standards**  
**Last update: 23 September 2025**

This document was intentionally created to ensure the code in our project is clear, consistent and easy to understand. By following these standards, we aim to minimize errors that will occur from poor coding style.

All programs in the POS system will follow this coding standard rule.

The document defines rules for **HTML**, **CSS**, **Javascript**, **Python**, **Sqlite**.

These rules will be updated as the competency progresses, to discuss rules for new constructions as we learn them.

**HTML** Coding Standard

**Comment Rule**

1. Every HTML file should start with a comment that says what the file is for. For example:

| \<\!--  File: index.html  Purpose: POS dashboard  Author: Your Name  Date: 24 Sep 2025\--\> |
| :---- |

2. Every section of the code must include the comment at the top. For example:

| \<\!-- Page Header \--\>\<header\>  \<h1\>My POS System\</h1\>\</header\> |
| :---- |

	

**Naming Rule**

1. Use lowercase element names. For example:

| \<body\>     \<p\>This is a paragraph\</p\> \</body\> |
| :---- |

           

2. Use lowercase attribute names. For example:

| \<a href="Test.com"\>Coding Standards\</a\> |
| :---- |

3. Use kebab-case (words with dashes) for IDs and classes

| \<div id="order-summary"\>\</div\> |
| :---- |

**Code Format Rules**

1. Close all elements.  
   

| \<section\>	\<p\>Test\</p\>	\<p\>This is a paragraph\</p\>\</section\> |
| :---- |

2. Always quote attribute values

3. Avoid spaces around equal signs

| \<table class="striped"\>\</table\> |
| :---- |

4. Add blank lines to separate large code blocks

| \<body\>    \<p\>This is a paragraph\</p\>\</body\>\<section\>    \<p\>Test\</p\>    \<p\>This is a paragraph\</p\>\</section\> |
| :---- |

**Javascript** Coding Standard

**Comment Rules**

1. Every top of the source file must have a comment. For example:

| /\*  File: cart.js  Purpose: Cart logic for POS  Create by Your Name, 23 Sep 2025\*/ |
| :---- |

     

2. For functions, write a short comment to describe what it does.  
     
3. Use short inline comments only when the code is not easy to understand. For example:

| let total \= 0; // keep track of the running total |
| :---- |

   

   

   **Naming Rules**

   

1. Use camelCase for variables, functions and classes. For example:

| let totalCents \= 100;function calcChange(){ ... }class paymentService { ... } |
| :---- |

2. Use all capital letters for constants.

	

3. Use a simple and clear name. 

	

**Code Format Rules**

1. Always end a simple statement with semicolon

| const people \= \["Tay", "Pen", "Tey", "Taycan"\]; |
| :---- |

   

2. Use colon plus one space between each property and its value. For example:

| const person \= {  name: "Tay",  age: 20}; |
| :---- |

3. Place the closing bracket on a new line, without leading spaces

| const student \= {  name: "Sippapas Sudlhor",  Age: 59,  isActive: true}; |
| :---- |

   

4. Always use 2 spaces for indentation of code blocks

| function toCelsius(fahrenheit) {  Return (5 / 9\) \* (fahrenheit \- 32\)} |
| :---- |

   

5. Always put spaces around operators ( \= \+ \- \* / ), and after comma

| let x \= 10 \+ 5;let y \= x \* 2 \- 4;if (y \=== 16\) {   console.log("Correct\!");} |
| :---- |

**CSS** Coding Standard

1. Always have one line of whitespace to separate code

   

2. Use double quotes

   

3. All ids, classes, and attributes must be lowercase with hyphens used for separation

**Sqlite** Coding Standard

**Code Format Rules**

1. Every nested clause (e.g., FROM, WHERE, JOIN, etc.) should be indented with **2 spaces**, not 4 spaces or tabs

| SELECT \*  FROM user\_account  WHERE created\_at \> DATE('now', '-7 day'); |
| :---- |

   

2. Don’t let any SQL statement line exceed 80 characters. Break long queries into multiple lines.

| SELECT u.username,       u.email,       u.created\_at,       COUNT(o.order\_id) AS total\_orders  FROM user\_account u  JOIN orders o    ON u.user\_id \= o.user\_id WHERE o.status \= 'completed' ORDER BY total\_orders DESC; |
| :---- |

3. Choose one style for SQL keywords (commonly ALL UPPERCASE or all lowercase) and stick with it everywhere.

| SELECT username  FROM user\_account WHERE created\_at \> DATE('now');select username  from user\_account where created\_at \> date('now'); |
| :---- |

**Naming rules**

1. Use descriptive, self-explanatory names (not cryptic abbreviations like t1, c1).

| CREATE TABLE user\_account (  user\_id    INTEGER PRIMARY KEY,  username   TEXT NOT NULL UNIQUE,  email      TEXT NOT NULL,  created\_at DATETIME DEFAULT CURRENT\_TIMESTAMP);CREATE TABLE t1 (  c1 INTEGER PRIMARY KEY,  c2 TEXT); |
| :---- |

   

**Comment rule**

1. Use \-- comment to explain non-obvious queries, especially those with subqueries, multiple joins, or business rules.

| \-- Select usernames of users who have spent more than 1000 in total ordersSELECT username  FROM user\_account WHERE user\_id IN (   \-- Subquery: find all users with total order value \> 1000   SELECT user\_id     FROM orders    WHERE total \> 1000 ); |
| :---- |

**Python** Coding Standard

**Comment Rules**

1. Every Python file (.py) must begin with a comment that briefly describes the purpose of the file.  
     
     
2. Every function must include the comment at the top  
     
3. Use inline comments only when the code is clear to understand.  
     
4. Write clear, concise comments that explain why the code does something, rather than what it does.

5. Limit all lines to a maximum of 79 characters, with docstrings and comments limited to 72 characters.  
     
   **Naming Rules**  
     
1. Variable, function, and module names must be meaningful and describe their purpose. (Avoid single-letter variable names, except some condition like loop counter)  
     
2. Use camelCase for variables, functions.  
     
3. Constants must be written in capital letters   
   

**Code Format Rules**

1. Be consistent with quote, single quote or double quote for string literals. Triple quote for docstrings.  
     
2. Avoid trailing whitespace and surround binary operators (e.g., \=, \+, \==) with a single space on either side.