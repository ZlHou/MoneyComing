package com.moneycoming.data.model

data class AccountWithBalance(
    val accountId: Long,
    val accountName: String,
    val accountType: String,
    val month: String,
    val amount: Double
)

data class MonthlyTotal(
    val month: String,
    val total: Double
)
