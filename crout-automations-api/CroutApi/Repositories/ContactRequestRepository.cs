using CroutApi.Helpers;
using CroutApi.Models;
using Dapper;

namespace CroutApi.Repositories;

public class ContactRequestRepository(DbHelper db) : IContactRequestRepository
{
    public async Task<int> CreateAsync(ContactRequest request)
    {
        using var conn = db.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            """
            INSERT INTO ContactRequests
              (Name, Email, Phone, Business, Service, Message, Referral, ConfigJson, Source, EmailSent)
            VALUES
              (@Name, @Email, @Phone, @Business, @Service, @Message, @Referral, @ConfigJson, @Source, @EmailSent);
            SELECT LAST_INSERT_ID();
            """,
            request);
    }
}
