using System.Text;
using TMPro;
using UnityEngine;

[RequireComponent(typeof(TextMeshPro))]
public class GetUserInformation : MonoBehaviour
{
    TextMeshPro _textMesh;
    
    // Start is called before the first frame update
    void Start()
    {
        var parser = new TelegramWebUrlParser();
        _textMesh = GetComponent<TextMeshPro>();
        var user = parser.tgSessionData?.tgWebAppData?.user;
        if (user == null)
        {
            _textMesh.text = "No data found.";
            return;
        }

        _textMesh.text = new StringBuilder().AppendLine($"user.id: {user.id ?? "(null)"}")
            .AppendLine($"user.username: {user.username ?? "(null)"}")
            .AppendLine($"user.language_code: {user.language_code ?? "(null)"}")
            .AppendLine($"chat_instance: {parser.tgSessionData.tgWebAppData.chat_instance ?? "(null)"}")
            .AppendLine($"tgWebAppPlatform: {parser.tgSessionData.tgWebAppPlatform ?? "(null)"}")
            .AppendLine().ToString();
    }    

    // Update is called once per frame
    void Update()
    {
        
    }
}
