package com.moneycoming.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.moneycoming.data.model.Account
import com.moneycoming.data.model.MonthlyBalance

@Database(entities = [Account::class, MonthlyBalance::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun accountDao(): AccountDao
    abstract fun monthlyBalanceDao(): MonthlyBalanceDao
}
