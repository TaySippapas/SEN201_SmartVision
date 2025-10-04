pragma foreign_keys = on;

create table product 
(
  product_id integer primary key autoincrement,
  name text not null,
  description text,
  price real not null check(price > 0),
  total_sales integer default 0 check(total_sales > 0),
  quantity integer not null check(quantity > 0)
);

create table total_transaction 
(
  transaction_id integer primary key autoincrement,
  total_amount real not null check(total_amount > 0),
  date_and_time datetime not null,
  payment_method text
);

create table each_transaction 
(
  each_transaction_id integer primary key autoincrement,
  transaction_id integer not null,
  product_id integer not null,
  quantity integer not null default 1 check(quantity > 0),
  foreign key (transaction_id) references total_transaction(transaction_id),
  foreign key (product_id) references product(product_id)
);
