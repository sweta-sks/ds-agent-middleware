async function numberToColumn(num) {
  let col = "";

  while (num > 0) {
    let data = (num - 1) % 26;
    col = String.fromCharCode(65 + data) + col;

    num = Math.floor((num - 1) / 26);
  }
  console.log(col);
  return col;
}

numberToColumn(100);
