using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Networking;

[RequireComponent(typeof(TextMeshPro))]
public class PostToWeb : MonoBehaviour
{
    const string jsonContentType = "application/json";
    Uri secretUrl = new("https://<X!REPLACE WITH API ID!X>.execute-api.us-east-1.amazonaws.com/latest");
    private TextMeshPro _textMesh;
    private TelegramWebUrlParser _parser;

    // Start is called before the first frame update
    void Start()
    {
        _parser = new TelegramWebUrlParser();
        _textMesh = GetComponent<TextMeshPro>();
        // Make fake telegram data to send to repository
        var data = _parser.tgSessionData ?? new TelegramWebUrlParser.TelegramSessionData
        {
            tgWebAppPlatform = "Dummy Platform",
            tgWebAppVersion = "0.0.0",
            tgWebAppThemeParams = new Dictionary<string, string>
            {
                { "No color", "#000000" }
            },
            tgWebAppBotInline = "None",
            tgWebAppData = new TelegramWebUrlParser.WebAppData()
            {
                auth_date = "-1",
                chat_instance = "-1",
                chat_type = "fake",
                user = new TelegramWebUrlParser.WebUserData()
                {
                    id = "111111111",
                    language_code = "en",
                    allows_write_to_pm = true,
                    is_premium = true,
                    username = "anonymous",
                }
            }
        };
        var body = JsonUtility.ToJson(data);
        StartCoroutine(Upload(body));
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    IEnumerator Upload(string body)
    {
        using UnityWebRequest www = UnityWebRequest.Post(secretUrl, body, jsonContentType);
        yield return www.SendWebRequest();
        if (www.result != UnityWebRequest.Result.Success)
        {
            _textMesh.text = www.error;
        }
        else
        {
            _textMesh.text = www.downloadHandler.text;
        }
    }
}
