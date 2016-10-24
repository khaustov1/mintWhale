var storage = require('storage')
var inventory = require('inventory')
var navigation = require('navigation')
var logger = require('logger')

function handleMoment(context, navigation) {
  try{
  var receiptOverallPrice = 0;
  var receipt = context.receipt;
  var suggestions = JSON.parse(storage.get("receipt-suggestions-"+receipt.id));
  var products = JSON.parse(storage.get("suggestion-process-"+receipt.id)).items;
  var receiptProducts =
    products
    .map(productId => inventory.getProduct(productId["uuid"]));

  for(var i in receiptProducts) {
      var product = JSON.parse(receiptProducts[i]);
      receiptOverallPrice += (product["PRICE_OUT"]/100);
  }
  var suggestedProducts =
    suggestions
    .map(productId => inventory.getProduct(productId));
  if (suggestedProducts.length > 0) {
    navigation.pushView("client/views/suggestion-list/view.html", {
      suggestions: suggestedProducts,
      receiptSum: receiptOverallPrice.toFixed(2),
      receiptId: receipt.id
    });
  } else {
    navigation.pushNext();
  }
}
catch(e){
  navigation.pushNext();
}
}
