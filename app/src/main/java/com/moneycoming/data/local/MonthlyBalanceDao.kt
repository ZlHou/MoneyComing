package com.moneycoming.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.moneycoming.data.model.AccountWithBalance
import com.moneycoming.data.model.MonthlyBalance
import com.moneycoming.data.model.MonthlyTotal
import kotlinx.coroutines.flow.Flow

@Dao
interface MonthlyBalanceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(balance: MonthlyBalance): Long

    @Query(
        """
        SELECT a.id AS accountId, a.name AS accountName, a.type AS accountType, mb.month AS month, mb.amount AS amount
        FROM accounts a
        LEFT JOIN monthly_balances mb ON mb.accountId = a.id AND mb.month = :month
        WHERE a.enabled = 1
        ORDER BY a.name
        """
    )
    fun observeAccountsForMonth(month: String): Flow<List<AccountWithBalance>>

    @Query(
        """
        SELECT mb.month AS month, SUM(mb.amount) AS total
        FROM monthly_balances mb
        JOIN accounts a ON a.id = mb.accountId
        WHERE a.enabled = 1
        GROUP BY mb.month
        ORDER BY mb.month
        """
    )
    fun observeMonthlyTotals(): Flow<List<MonthlyTotal>>

    @Query("SELECT * FROM monthly_balances")
    suspend fun getAll(): List<MonthlyBalance>
}
