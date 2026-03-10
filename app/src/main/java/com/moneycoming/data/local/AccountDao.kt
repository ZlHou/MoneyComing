package com.moneycoming.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.moneycoming.data.model.Account
import kotlinx.coroutines.flow.Flow

@Dao
interface AccountDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(account: Account): Long

    @Query("SELECT * FROM accounts WHERE enabled = 1 ORDER BY name")
    fun observeEnabledAccounts(): Flow<List<Account>>

    @Query("SELECT * FROM accounts ORDER BY name")
    suspend fun getAll(): List<Account>
}
