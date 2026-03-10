package com.moneycoming.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "monthly_balances",
    indices = [Index(value = ["accountId", "month"], unique = true)],
    foreignKeys = [
        ForeignKey(
            entity = Account::class,
            parentColumns = ["id"],
            childColumns = ["accountId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class MonthlyBalance(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val accountId: Long,
    val month: String,
    val amount: Double,
    val note: String = "",
    val updatedAt: Long = System.currentTimeMillis()
)
