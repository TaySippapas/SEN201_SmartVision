-- Table storing information about all products available for sale
create table product 
(
  product_id integer primary key autoincrement,
  name text not null,
  description text,
  price real not null check(price > 0),
  total_sales integer default 0 check(total_sales >= 0),
  quantity integer not null check(quantity >= 0)
);

-- Table summarizing each completed transaction
create table total_transaction 
(
  transaction_id integer primary key autoincrement,
  total_amount real not null check(total_amount > 0),
  date_and_time datetime not null,
  payment_method text
);

-- Table linking each item sold to a transaction record
create table each_transaction 
(
  each_transaction_id integer primary key autoincrement,
  name text not null,
  transaction_id integer not null,
  price real not null check(price > 0),
  quantity integer not null default 1 check(quantity > 0),
  foreign key (transaction_id) references total_transaction(transaction_id)
);
