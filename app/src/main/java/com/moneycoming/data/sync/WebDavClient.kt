package com.moneycoming.data.sync

import okhttp3.Credentials
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class WebDavClient(
    private val baseUrl: String,
    username: String,
    password: String,
    private val httpClient: OkHttpClient = OkHttpClient()
) {
    private val authHeader = Credentials.basic(username, password)

    fun upload(path: String, content: ByteArray) {
        val request = Request.Builder()
            .url("$baseUrl/$path")
            .header("Authorization", authHeader)
            .put(content.toRequestBody("application/octet-stream".toMediaType()))
            .build()

        httpClient.newCall(request).execute().use { response ->
            require(response.isSuccessful) { "Upload failed: ${response.code}" }
        }
    }

    fun download(path: String): ByteArray {
        val request = Request.Builder()
            .url("$baseUrl/$path")
            .header("Authorization", authHeader)
            .get()
            .build()

        httpClient.newCall(request).execute().use { response ->
            require(response.isSuccessful) { "Download failed: ${response.code}" }
            return response.body?.bytes() ?: ByteArray(0)
        }
    }
}
