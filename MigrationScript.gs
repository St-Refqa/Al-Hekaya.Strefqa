function setupNewDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  // 1. Get the first sheet (containing the old data)
  var oldSheet = ss.getSheets()[0];
  var oldData = oldSheet.getDataRange().getValues();
  
  if (oldData.length < 2) {
    ui.alert("الشيت الأول لا يحتوي على بيانات كافية للنقل.");
    return;
  }

  // 2. Create New Orders Sheet
  var ordersSheet = createOrGetSheet(ss, "الطلبات (Orders)");
  var ordersHeaders = [
    "Order ID", "التاريخ", "اسم العميل", "التليفون", "المحافظة", 
    "المنطقة", "المنتجات", "الكمية", "السعر", "الخصم", 
    "الإجمالي", "المدفوع", "المتبقي", "حالة الطلب"
  ];
  ordersSheet.getRange(1, 1, 1, ordersHeaders.length).setValues([ordersHeaders])
             .setFontWeight("bold")
             .setBackground("#4a86e8")
             .setFontColor("white");

  // 3. Create Products & Inventory Sheet
  var productsSheet = createOrGetSheet(ss, "المنتجات والمخزن (Products)");
  var productsHeaders = [
    "اسم المنتج", "التصنيف (Type)", "سعر التكلفة", "سعر البيع", 
    "تكلفة العمالة", "الربح", "الكمية في المخزن"
  ];
  productsSheet.getRange(1, 1, 1, productsHeaders.length).setValues([productsHeaders])
               .setFontWeight("bold")
               .setBackground("#38761d")
               .setFontColor("white");

  // Set formula for Profit: Sell - Cost - Labor
  // =D2-C2-E2
  
  // 4. Create Expenses Sheet
  var expensesSheet = createOrGetSheet(ss, "المصروفات (Expenses)");
  var expensesHeaders = [
    "التاريخ", "المبلغ", "التصنيف", "التفاصيل"
  ];
  expensesSheet.getRange(1, 1, 1, expensesHeaders.length).setValues([expensesHeaders])
               .setFontWeight("bold")
               .setBackground("#cc0000")
               .setFontColor("white");

  // 5. Create Clients Sheet
  var clientsSheet = createOrGetSheet(ss, "العملاء (Clients)");
  var clientsHeaders = [
    "اسم العميل", "التليفون", "المحافظة", "المنطقة", "الكنيسة", "العنوان بالكامل"
  ];
  clientsSheet.getRange(1, 1, 1, clientsHeaders.length).setValues([clientsHeaders])
              .setFontWeight("bold")
              .setBackground("#e69138")
              .setFontColor("white");

  // --- MIGRATION LOGIC ---
  var newOrdersData = [];
  var clientsMap = {};
  var productsMap = {};

  for (var i = 1; i < oldData.length; i++) {
    var row = oldData[i];
    
    // Extracting old order values based on the 24-column layout
    var clientName = String(row[0] || "").trim();
    var date = row[1];
    var phone = String(row[2] || "").trim();
    var gov = String(row[3] || "").trim();
    var region = String(row[4] || "").trim();
    var orderDetails = String(row[6] || "").trim();
    var qty = row[7] || 0;
    var price = row[8] || 0;
    var discount = row[9] || 0;
    var total = row[10] || 0;
    var deposit = row[11] || 0;
    var rest = row[13] || 0;
    
    // Status Logic
    var isProcessed = row[14]; // O
    var isDelivery = row[15];  // P
    var isDone = row[19];      // T
    var isDesigned = row[21];  // V
    var isPrinted = row[22];   // W
    var isReceived = row[23];  // X
    
    var orderId = String(row[16] || "").trim();
    if (!orderId && clientName) {
      orderId = "ORD-OLD-" + i;
    }

    var status = "قيد الانتظار";
    if (isDone) status = "تم التوصيل";
    else if (isDelivery) status = "تسليم للشحن";
    else if (isProcessed) status = "جاهز للتسليم";
    else if (isReceived) status = "تم الاستلام";
    else if (isPrinted) status = "للطباعة";
    else if (isDesigned) status = "للتصميم";

    if (clientName) {
      // Add to Orders
      newOrdersData.push([
        orderId, date, clientName, phone, gov, region, orderDetails,
        qty, price, discount, total, deposit, rest, status
      ]);

      // Add to Clients Map
      if (!clientsMap[clientName]) {
        clientsMap[clientName] = {
          name: clientName, phone: phone, gov: gov, region: region, fullAddress: gov + " - " + region
        };
      }

      // Add to Products Map
      if (orderDetails && !productsMap[orderDetails]) {
        productsMap[orderDetails] = {
          name: orderDetails, price: price
        };
      }
    }
  }

  // Write Orders
  if (newOrdersData.length > 0) {
    ordersSheet.getRange(2, 1, newOrdersData.length, newOrdersData[0].length).setValues(newOrdersData);
  }

  // Write Clients
  var clientsArray = [];
  for (var key in clientsMap) {
    var c = clientsMap[key];
    clientsArray.push([c.name, c.phone, c.gov, c.region, "", c.fullAddress]);
  }
  if (clientsArray.length > 0) {
    clientsSheet.getRange(2, 1, clientsArray.length, clientsArray[0].length).setValues(clientsArray);
  }

  // Write Products
  var productsArray = [];
  var pRow = 2;
  for (var key in productsMap) {
    var p = productsMap[key];
    productsArray.push([p.name, "Workshop", 0, p.price, 5, "=(D"+pRow+"-C"+pRow+"-E"+pRow+")", 0]);
    pRow++;
  }
  if (productsArray.length > 0) {
    productsSheet.getRange(2, 1, productsArray.length, productsArray[0].length).setValues(productsArray);
  }

  // Setup Data Validation for Order Status
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["قيد الانتظار", "للتصميم", "للطباعة", "تم الاستلام", "جاهز للتسليم", "تسليم للشحن", "تم التوصيل"], true)
    .setAllowInvalid(false)
    .build();
  ordersSheet.getRange("N2:N").setDataValidation(rule);

  // Freeze top rows
  ordersSheet.setFrozenRows(1);
  productsSheet.setFrozenRows(1);
  expensesSheet.setFrozenRows(1);
  clientsSheet.setFrozenRows(1);

  ui.alert("تم بناء قاعدة البيانات ونقل البيانات بنجاح! 🎉");
}

function createOrGetSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear(); // Clear existing content if it exists
  }
  return sheet;
}
