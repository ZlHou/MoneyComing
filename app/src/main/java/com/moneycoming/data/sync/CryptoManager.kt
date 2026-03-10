package com.moneycoming.data.sync

import android.util.Base64
import java.nio.ByteBuffer
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

class CryptoManager(secret: String) {
    private val key: SecretKey = SecretKeySpec(secret.padEnd(32, '0').take(32).toByteArray(), "AES")
    private val secureRandom = SecureRandom()

    fun encrypt(data: ByteArray): ByteArray {
        val iv = ByteArray(12).also { secureRandom.nextBytes(it) }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(data)
        return ByteBuffer.allocate(iv.size + encrypted.size)
            .put(iv)
            .put(encrypted)
            .array()
    }

    fun decrypt(data: ByteArray): ByteArray {
        val buffer = ByteBuffer.wrap(data)
        val iv = ByteArray(12)
        buffer.get(iv)
        val encrypted = ByteArray(buffer.remaining())
        buffer.get(encrypted)

        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
        return cipher.doFinal(encrypted)
    }

    fun encodeBase64(data: ByteArray): String = Base64.encodeToString(data, Base64.NO_WRAP)
}
