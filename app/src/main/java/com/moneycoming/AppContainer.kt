package com.moneycoming

import android.content.Context
import androidx.room.Room
import com.moneycoming.data.local.AppDatabase
import com.moneycoming.data.repository.AssetsRepository

class AppContainer(context: Context) {
    private val db = Room.databaseBuilder(
        context,
        AppDatabase::class.java,
        "moneycoming.db"
    ).build()

    val repository = AssetsRepository(
        accountDao = db.accountDao(),
        monthlyBalanceDao = db.monthlyBalanceDao()
    )
}
