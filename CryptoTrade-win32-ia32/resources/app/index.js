let $ = require('jquery')
const { dialog } = require('electron')

var PUBLIC_YOBIT = new Yobit();
var PRIVATE_YOBIT = undefined;

function getPair() {
    var ret = "";
    c1 = $('#target_coin').val();
    c2 = $('#base_coin').val();
    if (c1.length > 0 && c2.length > 0) {
        ret = c1 + "_" + c2;
    }
    return ret;
}

function log(text) {
    $('#console').append(text + "<br>");
}


function trades() {
    var pair = getPair();
    if (pair.length > 0) {
        PUBLIC_YOBIT.getTrades(function (error, data) {
            if (error) {
                log("trades::" + pair + ": error " + error)
            } else {
                if (pair in data) {
                    data = data[pair];
                    for (let index = 0; index < data.length; index++) {
                        const element = data[index];
                        if (element["type"] == "ask") {
                            log("trades::" + pair + ":trade history venta: " + element["price"] + ", " + (new Date(element["timestamp"] * 1000)).toLocaleString())
                        } else if (element["type"] == "bid") {
                            log("trades::" + pair + ":trade history compra: " + element["price"] + ", " + (new Date(element["timestamp"] * 1000)).toLocaleString())
                        }
                    }
                } else if ("error" in data) {
                    log("trades::" + pair + ": error: " + data["error"])
                }
            }
        }, pair, 10);
    } else {
        log("trades::" + "Has puesto las monedas?");
    }
}

function orders() {
    var pair = getPair();
    if (pair.length > 0) {
        PUBLIC_YOBIT.getOrderBook(function (error, data) {
            if (error) {
                log("orders::" + pair + ": error " + error)
            } else {
                if (pair in data) {
                    log("orders::" + pair + ":orden de venta: " + data[pair]["asks"])
                    log("orders::" + pair + ":orden de compra: " + data[pair]["bids"])
                } else if ("error" in data) {
                    log("orders::" + pair + ": error: " + data["error"])
                }
            }
        }, pair, 1);
    } else {
        log("orders::" + "Has puesto las monedas?");
    }
}

function userInfo() {
    PRIVATE_YOBIT.getInfo(function (error, data) {
        if (error) {
            log("user info: error " + error)
        } else if ("success" in data) {
            if(data["success"] == 1){
                data = data["return"];
                log("userInfo::transaction_count: " + data["transaction_count"]);
                log("userInfo::open_orders: " + data["open_orders"]);
                var funds = data["funds"];
                for (const coin in funds) {
                    if (funds.hasOwnProperty(coin)) {
                        const value = funds[coin];
                        log("userInfo::tienes " + value + " " + coin);
                    }
                }
                funds = data["funds_incl_orders"];
                for (const coin in funds) {
                    if (funds.hasOwnProperty(coin)) {
                        const value = funds[coin];
                        log("userInfo::tienes " + value + " " + coin + "(incluyendo ordenes en ejecucion)");
                    }
                }
            }
        }
    });
}

function getAmountOf(coin, cb){
    ret = 0.0;
    PRIVATE_YOBIT.getInfo(function (error, data) {
        if (error) {
            log("getAmountOf: error " + error)
        } else if ("success" in data) {
            if(data["success"] == 1){
                data = data["return"]["funds"];
                if(coin in data){
                    ret = parseFloat(data[coin]) * 0.98;
                    cb(ret)
                }else{
                    log("getAmountOf::no tienes " + coin)
                }
            }else{
                log("getAmountOf::error " + data["error"])
            }
        }
    });
}

function getLastSellOrderRate(pair, cb){
    PUBLIC_YOBIT.getOrderBook(function (error, data) {
        if (error) {
            log("getLastSellOrderRate::" + pair + ": error " + error)
        } else {
            if (pair in data) {
                data = data[pair]
                if("asks" in data){
                    data = data["asks"]
                    cb(data[0][0]);
                }else{
                    log("getLastSellOrderRate::" + pair + ": error: no hey ventas")
                }
            } else if ("error" in data) {
                log("getLastSellOrderRate::" + pair + ": error: " + data["error"])
            }
        }
    }, pair, 1);
}

function getLastBuyOrderRate(pair, cb){
    PUBLIC_YOBIT.getOrderBook(function (error, data) {
        if (error) {
            log("getLastBuyOrderRate::" + pair + ": error " + error)
        } else {
            if (pair in data) {
                data = data[pair]
                if("bids" in data){
                    data = data["bids"]
                    cb(data[0][0]);
                }else{
                    log("getLastBuyOrderRate::" + pair + ": error: no hey compras")
                }
            } else if ("error" in data) {
                log("getLastBuyOrderRate::" + pair + ": error: " + data["error"])
            }
        }
    }, pair, 1);
}

function buy() {
    var pair = getPair();
    if (pair.length > 0) {
        var target_coin = $('#target_coin').val();
        var base_coin = $('#base_coin').val();
        getAmountOf(base_coin, function(amount_base){
            log("buy::lo que tengo: " + amount_base + " " + base_coin);
            var type = "buy";
            var percent = $('#percent').val();
            var factor = percent / 100;
            var rate = 0;
            amount_base = factor * amount_base;///moneda que quieres comprar
            log("buy::quiero comprar : " + amount_base + " " + base_coin);
            getLastSellOrderRate(pair, function(pair_rate){
                rate = pair_rate;
                log("buy::la ultima venta se hizo a : " + rate + " " + base_coin);
                target_amount = amount_base / rate;
                log("buy::quiero comprar : " + target_amount + " " + target_coin);
                PRIVATE_YOBIT.addTrade(function (error, data) {
                    if (error) {
                        log("buy::error " + error)
                    } else if ("success" in data) {
                        if(data["success"] == 1){
                            data = data["return"];
                            log("buy::SUCCESSFUL");
                            log("buy::received: " + data["received"]);
                            log("buy::remains: " + data["remains"]);
                            log("buy::order_id: " + data["order_id"]);
                            var funds = data["funds"];
                            for (const coin in funds) {
                                if (funds.hasOwnProperty(coin)) {
                                    const value = funds[coin];
                                    log("buy::tienes " + value + " " + coin);
                                }
                            }
                        }else{
                            log("buy::error " + data["error"])
                        }
                    }
                }, pair, type, target_amount, rate);
            })
        });
    } else {
        log("buy::Has puesto las monedas?");
    }
}

function sell() {
    var pair = getPair();
    if (pair.length > 0) {
        var target_coin = $('#target_coin').val();
        var base_coin = $('#base_coin').val();
        getAmountOf(target_coin, function(amount_target){
            log("sell::lo que tengo: " + amount_target + " " + target_coin);
            var type = "sell";
            var percent = $('#percent').val();
            var factor = percent / 100;
            var rate = 0;
            amount_target = factor * amount_target;///moneda que quieres comprar
            log("sell::quiero vender : " + amount_target + " " + target_coin);
            getLastBuyOrderRate(pair, function(pair_rate){
                rate = pair_rate;
                log("sell::la ultima venta se hizo a : " + rate + " " + base_coin);
                log("sell::quiero vender : " + amount_target + " " + target_coin);
                PRIVATE_YOBIT.addTrade(function (error, data) {
                    if (error) {
                        log("sell::error " + error)
                    } else if ("success" in data) {
                        if(data["success"] == 1){
                            data = data["return"];
                            log("sell::SUCCESSFUL");
                            log("sell::received: " + data["received"]);
                            log("sell::remains: " + data["remains"]);
                            log("sell::order_id: " + data["order_id"]);
                            var funds = data["funds"];
                            for (const coin in funds) {
                                if (funds.hasOwnProperty(coin)) {
                                    const value = funds[coin];
                                    log("sell::tienes " + value + " " + coin);
                                }
                            }
                        }else{
                            log("sell::error " + data["error"])
                        }
                    }
                }, pair, type, amount_target, rate);
            })
        });
    } else {
        log("sell::Has puesto las monedas?");
    }
}

window.onload = function () {
    $('.logged').hide()
    $('#api_token_ok').click(function (e) {
        var api_token = $('#api_token').val();
        var api_secret = $('#api_secret').val();
        if (api_token.length > 0 && api_secret.length) {
            PRIVATE_YOBIT = new Yobit(api_token, api_secret);
            if (PRIVATE_YOBIT != undefined) {
                $('.not_logged').hide()
                $('.logged').show()
            } else {
                log("problema...")
            }
        } else {
            log("api token vacío, Pon un api token")
        }
    })

    $('#trades_button').click(function (e) {
        trades();
    })

    $('#order_book_button').click(function (e) {
        orders();
    })

    $('#user_info_button').click(function (e) {
        userInfo();
    })

    $('#buy_button').click(function (e) {
        buy();
    })

    $('#sell_button').click(function (e) {
        sell();
    })

    $('#reset_log_button').click(function (e) {
        $('#console').text("");
    })

}